use std::path::{Path, PathBuf};
use std::process::Command;

/// Render a Java Edition world with BlueMap CLI.
/// Returns the path to the generated web root on success.
pub fn render_world(world_path: &Path, _job_id: &str, cache_dir: &Path) -> Result<PathBuf, String> {
    let webroot = world_path.parent().unwrap_or(world_path).join("bluemap-web");
    std::fs::create_dir_all(&webroot).map_err(|e| format!("Failed to create webroot: {e}"))?;

    let config_dir = world_path.parent().unwrap_or(world_path).join("bluemap-config");
    write_configs(&config_dir, world_path, &webroot, cache_dir)?;

    let status = Command::new("java")
        .args([
            "-jar",
            "/usr/local/bin/bluemap.jar",
            "--config",
            config_dir.to_str().unwrap(),
            "--render",
            "--no-server",
        ])
        .status()
        .map_err(|e| format!("Failed to launch BlueMap: {e}"))?;

    if !status.success() {
        return Err(format!("BlueMap exited with status: {status}"));
    }

    Ok(webroot)
}

fn write_configs(
    config_dir: &Path,
    world_path: &Path,
    webroot: &Path,
    cache_dir: &Path,
) -> Result<(), String> {
    std::fs::create_dir_all(config_dir).map_err(|e| format!("mkdir config: {e}"))?;
    std::fs::create_dir_all(config_dir.join("maps")).map_err(|e| format!("mkdir maps: {e}"))?;
    std::fs::create_dir_all(config_dir.join("storages")).map_err(|e| format!("mkdir storages: {e}"))?;

    // core.conf
    let core = format!(
        r#"accept-download: true
data: "{data}"
metrics: false
"#,
        data = cache_dir.display(),
    );
    write_file(&config_dir.join("core.conf"), &core)?;

    // webapp.conf — point webroot to our output dir
    let webapp = format!(
        r#"enabled: true
webroot: "{webroot}"
"#,
        webroot = webroot.display(),
    );
    write_file(&config_dir.join("webapp.conf"), &webapp)?;

    // storages/file.conf
    let storage = format!(
        r#"storage-type: FILE
root: "{root}/maps"
"#,
        root = webroot.display(),
    );
    write_file(&config_dir.join("storages").join("file.conf"), &storage)?;

    // maps/world.conf
    let map = format!(
        r#"name: "map2minecraft"
world: "{world}"
storage: "file"
enable-hires: false
remove-caves: true
min-y: -64
max-y: 320
"#,
        world = world_path.display(),
    );
    write_file(&config_dir.join("maps").join("world.conf"), &map)?;

    Ok(())
}

fn write_file(path: &Path, content: &str) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| format!("Write {}: {e}", path.display()))
}
