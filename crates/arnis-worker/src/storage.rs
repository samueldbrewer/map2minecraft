use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::ZipWriter;

/// Create a zip file of the generated world for download
pub fn create_world_zip(world_path: &Path, zip_path: &Path) -> Result<(), String> {
    let file = File::create(zip_path)
        .map_err(|e| format!("Failed to create zip file: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let world_name = world_path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy();

    for entry in WalkDir::new(world_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        let relative = path
            .strip_prefix(world_path)
            .map_err(|e| format!("Path error: {}", e))?;

        if relative.as_os_str().is_empty() {
            continue;
        }

        let archive_path = format!("{}/{}", world_name, relative.display());

        if path.is_file() {
            zip.start_file(&archive_path, options)
                .map_err(|e| format!("Zip error: {}", e))?;
            let mut f = File::open(path)
                .map_err(|e| format!("Failed to open file: {}", e))?;
            let mut buffer = Vec::new();
            f.read_to_end(&mut buffer)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            zip.write_all(&buffer)
                .map_err(|e| format!("Failed to write to zip: {}", e))?;
        } else if path.is_dir() {
            zip.add_directory(&archive_path, options)
                .map_err(|e| format!("Zip directory error: {}", e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finish zip: {}", e))?;

    Ok(())
}
