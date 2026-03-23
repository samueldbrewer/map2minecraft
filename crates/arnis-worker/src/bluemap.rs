use std::path::{Path, PathBuf};
use std::process::Command;

/// Render a Java Edition world with BlueMap CLI.
/// Returns the path to the generated web root on success.
pub fn render_world(world_path: &Path, _job_id: &str, cache_dir: &Path) -> Result<PathBuf, String> {
    let base_dir = world_path.parent().unwrap_or(world_path);
    let webroot = base_dir.join("bluemap-web");
    let config_dir = base_dir.join("bluemap-config");

    std::fs::create_dir_all(&webroot).map_err(|e| format!("mkdir webroot: {e}"))?;
    std::fs::create_dir_all(&config_dir).map_err(|e| format!("mkdir config: {e}"))?;

    // Step 1: Let BlueMap generate default configs (will fail because no valid world, but configs are written)
    let _ = Command::new("java")
        .args([
            "-jar", "/usr/local/bin/bluemap.jar",
            "-c", config_dir.to_str().unwrap(),
        ])
        .output();

    // Debug: verify world structure before configuring BlueMap
    eprintln!("[BlueMap] World path: {}", world_path.display());
    eprintln!("[BlueMap] level.dat exists: {}", world_path.join("level.dat").exists());
    eprintln!("[BlueMap] region/ exists: {}", world_path.join("region").exists());
    if let Ok(entries) = std::fs::read_dir(world_path.join("region")) {
        let mca_files: Vec<_> = entries.flatten()
            .filter(|e| e.path().extension().map(|x| x == "mca").unwrap_or(false))
            .collect();
        eprintln!("[BlueMap] .mca files: {}", mca_files.len());
        for f in &mca_files {
            let size = std::fs::metadata(f.path()).map(|m| m.len()).unwrap_or(0);
            eprintln!("  {} ({}B)", f.file_name().to_string_lossy(), size);
        }
    }
    if let Ok(entries) = std::fs::read_dir(world_path) {
        eprintln!("[BlueMap] World dir contents:");
        for entry in entries.flatten() {
            let meta = std::fs::metadata(entry.path());
            let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
            let is_dir = meta.map(|m| m.is_dir()).unwrap_or(false);
            eprintln!("  {} {}{}", if is_dir { "DIR " } else { "FILE" },
                entry.file_name().to_string_lossy(),
                if !is_dir { format!(" ({}B)", size) } else { String::new() });
        }
    } else {
        eprintln!("[BlueMap] WARNING: Cannot read world dir!");
    }

    // Step 2: Patch the generated configs
    patch_core_conf(&config_dir, cache_dir)?;
    patch_webapp_conf(&config_dir, &webroot)?;
    patch_storage_conf(&config_dir, &webroot)?;
    patch_map_configs(&config_dir, world_path)?;

    // Debug: show what overworld.conf looks like after patching
    let overworld_conf = config_dir.join("maps").join("overworld.conf");
    if let Ok(content) = std::fs::read_to_string(&overworld_conf) {
        eprintln!("[BlueMap] overworld.conf:\n{}", content);
    }

    // Step 3: Force render + generate webapp
    let output = Command::new("java")
        .args([
            "-jar", "/usr/local/bin/bluemap.jar",
            "-c", config_dir.to_str().unwrap(),
            "-f", "-g",
        ])
        .output()
        .map_err(|e| format!("Failed to launch BlueMap: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    // Log BlueMap output for debugging
    if !stdout.is_empty() {
        eprintln!("[BlueMap stdout] {}", stdout);
    }
    if !stderr.is_empty() {
        eprintln!("[BlueMap stderr] {}", stderr);
    }

    if !output.status.success() {
        return Err(format!(
            "BlueMap render failed (exit {}):\nstdout: {}\nstderr: {}",
            output.status, stdout, stderr
        ));
    }

    // Log webroot contents for debugging
    eprintln!("[BlueMap] Webroot contents:");
    if let Ok(entries) = std::fs::read_dir(&webroot) {
        for entry in entries.flatten() {
            let meta = std::fs::metadata(entry.path());
            let size = meta.map(|m| m.len()).unwrap_or(0);
            eprintln!("  {} ({}B)", entry.file_name().to_string_lossy(), size);
        }
    }

    Ok(webroot)
}

/// Set accept-download: true in core.conf
fn patch_core_conf(config_dir: &Path, cache_dir: &Path) -> Result<(), String> {
    let path = config_dir.join("core.conf");
    let content = read_or_default(&path);

    // Replace accept-download: false with true
    let mut patched = content.replace("accept-download: false", "accept-download: true");

    // Ensure data directory points to our cache dir
    if let Some(start) = patched.find("data:") {
        if let Some(end) = patched[start..].find('\n') {
            let before = &patched[..start];
            let after = &patched[start + end..];
            patched = format!("{}data: \"{}\"{}",
                before, cache_dir.display(), after);
        }
    }

    // Disable metrics
    patched = patched.replace("metrics: true", "metrics: false");

    write_file(&path, &patched)
}

/// Set webroot in webapp.conf
fn patch_webapp_conf(config_dir: &Path, webroot: &Path) -> Result<(), String> {
    let path = config_dir.join("webapp.conf");
    let content = read_or_default(&path);

    let mut patched = content.replace("enabled: false", "enabled: true");

    if let Some(start) = patched.find("webroot:") {
        if let Some(end) = patched[start..].find('\n') {
            let before = &patched[..start];
            let after = &patched[start + end..];
            patched = format!("{}webroot: \"{}\"{}",
                before, webroot.display(), after);
        }
    }

    write_file(&path, &patched)
}

/// Set storage root in storages/file.conf (or sql.conf, whichever exists)
fn patch_storage_conf(config_dir: &Path, webroot: &Path) -> Result<(), String> {
    let storages_dir = config_dir.join("storages");
    if !storages_dir.exists() {
        std::fs::create_dir_all(&storages_dir).map_err(|e| format!("mkdir storages: {e}"))?;
    }

    let file_conf = storages_dir.join("file.conf");
    if file_conf.exists() {
        let content = read_or_default(&file_conf);
        if let Some(start) = content.find("root:") {
            if let Some(end) = content[start..].find('\n') {
                let before = &content[..start];
                let after = &content[start + end..];
                let patched = format!("{}root: \"{}/maps\"{}",
                    before, webroot.display(), after);
                write_file(&file_conf, &patched)?;
            }
        }
    }
    Ok(())
}

/// Patch the map config to point to our world; remove nether/end maps
fn patch_map_configs(config_dir: &Path, world_path: &Path) -> Result<(), String> {
    let maps_dir = config_dir.join("maps");
    if !maps_dir.exists() {
        std::fs::create_dir_all(&maps_dir).map_err(|e| format!("mkdir maps: {e}"))?;
    }

    // Remove nether and end map configs
    let _ = std::fs::remove_file(maps_dir.join("nether.conf"));
    let _ = std::fs::remove_file(maps_dir.join("end.conf"));

    // Patch overworld.conf (the default-generated map config)
    let overworld = maps_dir.join("overworld.conf");
    if overworld.exists() {
        let content = read_or_default(&overworld);

        // Replace the world path
        let mut patched = content.clone();
        if let Some(start) = patched.find("world:") {
            if let Some(end) = patched[start..].find('\n') {
                let before = &patched[..start];
                let after = &patched[start + end..];
                patched = format!("{}world: \"{}\"{}",
                    before, world_path.display(), after);
            }
        }

        write_file(&overworld, &patched)?;
    } else {
        // No generated config found — shouldn't happen, but write a fallback
        // that matches v5 format expectations
        let fallback = format!(
            "world: \"{}\"\nstorage: \"file\"\n",
            world_path.display()
        );
        write_file(&overworld, &fallback)?;
    }

    Ok(())
}

fn read_or_default(path: &Path) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

fn write_file(path: &Path, content: &str) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| format!("Write {}: {e}", path.display()))
}
