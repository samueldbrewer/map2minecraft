use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct PreviewData {
    pub width: u32,
    pub height: u32,
    pub heightmap: Vec<u16>,
    pub colormap: Vec<[u8; 3]>,
    pub min_y: i32,
    pub max_y: i32,
}

/// Extract preview data (heightmap + colormap) from a generated Minecraft world.
/// Downsamples to max 512x512 for browser performance.
pub fn extract_preview_data(world_path: &Path) -> Result<PreviewData, String> {
    use fastanvil::Region;
    use fastnbt::{from_bytes, Value};
    use std::fs::File;

    let region_dir = world_path.join("region");
    if !region_dir.exists() {
        return Err("No region directory found".to_string());
    }

    // Find all region files to determine world bounds
    let mut min_x = i32::MAX;
    let mut max_x = i32::MIN;
    let mut min_z = i32::MAX;
    let mut max_z = i32::MIN;

    let entries: Vec<_> = std::fs::read_dir(&region_dir)
        .map_err(|e| format!("Failed to read region dir: {}", e))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "mca"))
        .collect();

    if entries.is_empty() {
        return Err("No region files found".to_string());
    }

    for entry in &entries {
        let name = entry.file_name().to_string_lossy().to_string();
        // Parse r.X.Z.mca
        let parts: Vec<&str> = name.split('.').collect();
        if parts.len() >= 4 {
            if let (Ok(rx), Ok(rz)) = (parts[1].parse::<i32>(), parts[2].parse::<i32>()) {
                min_x = min_x.min(rx * 512);
                max_x = max_x.max(rx * 512 + 511);
                min_z = min_z.min(rz * 512);
                max_z = max_z.max(rz * 512 + 511);
            }
        }
    }

    let raw_width = (max_x - min_x + 1) as u32;
    let raw_height = (max_z - min_z + 1) as u32;

    // Determine downsample factor
    let max_dim = 512u32;
    let downsample = ((raw_width.max(raw_height) + max_dim - 1) / max_dim).max(1);

    let width = (raw_width + downsample - 1) / downsample;
    let height = (raw_height + downsample - 1) / downsample;

    let mut heightmap = vec![0u16; (width * height) as usize];
    let mut colormap = vec![[200u8, 200u8, 200u8]; (width * height) as usize];
    let mut global_min_y = i32::MAX;
    let mut global_max_y = i32::MIN;

    // Process each region file
    for entry in &entries {
        let file = File::open(entry.path())
            .map_err(|e| format!("Failed to open region: {}", e))?;
        let mut region = Region::from_stream(file)
            .map_err(|e| format!("Failed to parse region: {}", e))?;

        let name = entry.file_name().to_string_lossy().to_string();
        let parts: Vec<&str> = name.split('.').collect();
        let (rx, rz) = if parts.len() >= 4 {
            (parts[1].parse::<i32>().unwrap_or(0), parts[2].parse::<i32>().unwrap_or(0))
        } else {
            continue;
        };

        let region_base_x = rx * 512;
        let region_base_z = rz * 512;

        for cx in 0..32 {
            for cz in 0..32 {
                if let Ok(Some(chunk_data)) = region.read_chunk(cx, cz) {
                    let chunk: Value = match from_bytes(&chunk_data) {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    let chunk_base_x = region_base_x + (cx as i32) * 16;
                    let chunk_base_z = region_base_z + (cz as i32) * 16;

                    // Sample blocks at downsample intervals
                    for lx in (0..16).step_by(downsample as usize) {
                        for lz in (0..16).step_by(downsample as usize) {
                            let world_x = chunk_base_x + lx as i32;
                            let world_z = chunk_base_z + lz as i32;

                            if world_x < min_x || world_x > max_x || world_z < min_z || world_z > max_z {
                                continue;
                            }

                            let px = ((world_x - min_x) as u32 / downsample).min(width - 1);
                            let pz = ((world_z - min_z) as u32 / downsample).min(height - 1);
                            let idx = (pz * width + px) as usize;

                            if let Some((y, color)) = find_top_block_with_color(&chunk, lx, lz) {
                                heightmap[idx] = y.max(0) as u16;
                                colormap[idx] = color;
                                global_min_y = global_min_y.min(y);
                                global_max_y = global_max_y.max(y);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(PreviewData {
        width,
        height,
        heightmap,
        colormap,
        min_y: global_min_y,
        max_y: global_max_y,
    })
}

/// Find the topmost non-air block and its color at a given local position in a chunk
fn find_top_block_with_color(chunk: &fastnbt::Value, local_x: usize, local_z: usize) -> Option<(i32, [u8; 3])> {
    use fastnbt::Value;

    let sections = match chunk {
        Value::Compound(map) => {
            if let Some(Value::List(secs)) = map.get("sections") {
                secs.clone()
            } else if let Some(Value::Compound(level)) = map.get("Level") {
                if let Some(Value::List(secs)) = level.get("sections") {
                    secs.clone()
                } else {
                    return None;
                }
            } else {
                return None;
            }
        }
        _ => return None,
    };

    // Sort sections by Y descending
    let mut sorted: Vec<(i8, &Value)> = Vec::new();
    for sec in &sections {
        if let Value::Compound(map) = sec {
            if let Some(Value::Byte(y)) = map.get("Y") {
                sorted.push((*y, sec));
            }
        }
    }
    sorted.sort_by(|a, b| b.0.cmp(&a.0));

    for (section_y, section) in &sorted {
        let section_map = match section {
            Value::Compound(m) => m,
            _ => continue,
        };

        let block_states = match section_map.get("block_states") {
            Some(Value::Compound(bs)) => bs,
            _ => continue,
        };

        let palette = match block_states.get("palette") {
            Some(Value::List(p)) => p,
            _ => continue,
        };

        // Single-block section optimization
        if palette.len() == 1 {
            if let Some(name) = get_block_name(&palette[0]) {
                if !is_air(&name) {
                    let y = (*section_y as i32) * 16 + 15;
                    return Some((y, block_name_to_color(&name)));
                }
            }
            continue;
        }

        let data = match block_states.get("data") {
            Some(Value::LongArray(d)) => d,
            _ => continue,
        };

        let bits = std::cmp::max(4, (palette.len() as f64).log2().ceil() as usize);
        let per_long = 64 / bits;
        let mask = (1u64 << bits) - 1;

        for local_y in (0..16).rev() {
            let idx = local_y * 256 + local_z * 16 + local_x;
            let long_idx = idx / per_long;
            let bit_off = (idx % per_long) * bits;

            if long_idx >= data.len() { continue; }

            let pal_idx = ((data[long_idx] as u64 >> bit_off) & mask) as usize;
            if pal_idx >= palette.len() { continue; }

            if let Some(name) = get_block_name(&palette[pal_idx]) {
                if !is_air(&name) {
                    let y = (*section_y as i32) * 16 + local_y as i32;
                    return Some((y, block_name_to_color(&name)));
                }
            }
        }
    }

    None
}

fn get_block_name(entry: &fastnbt::Value) -> Option<String> {
    if let fastnbt::Value::Compound(map) = entry {
        if let Some(fastnbt::Value::String(name)) = map.get("Name") {
            return Some(name.clone());
        }
    }
    None
}

fn is_air(name: &str) -> bool {
    let short = name.strip_prefix("minecraft:").unwrap_or(name);
    matches!(short, "air" | "cave_air" | "void_air")
}

/// Map block name to an RGB color for the preview
fn block_name_to_color(name: &str) -> [u8; 3] {
    let short = name.strip_prefix("minecraft:").unwrap_or(name);
    match short {
        "grass_block" => [86, 125, 70],
        "dirt" | "coarse_dirt" | "rooted_dirt" => [139, 90, 43],
        "stone" | "andesite" => [128, 128, 128],
        "granite" => [149, 108, 91],
        "diorite" => [189, 188, 189],
        "deepslate" => [72, 72, 73],
        "sand" => [219, 211, 160],
        "gravel" => [131, 127, 126],
        "water" => [59, 86, 165],
        "oak_log" | "spruce_log" | "birch_log" | "jungle_log" | "dark_oak_log" => [109, 85, 50],
        "oak_planks" | "oak_slab" | "oak_stairs" => [162, 130, 78],
        "spruce_planks" | "spruce_slab" => [115, 85, 49],
        "birch_planks" | "birch_slab" => [196, 179, 123],
        "dark_oak_planks" | "dark_oak_slab" => [67, 43, 20],
        "oak_leaves" | "spruce_leaves" | "birch_leaves" | "jungle_leaves" | "dark_oak_leaves" => [55, 95, 36],
        "stone_bricks" | "stone_brick_slab" | "stone_brick_stairs" => [122, 122, 122],
        "cobblestone" | "cobblestone_slab" | "cobblestone_stairs" => [128, 127, 127],
        "bricks" | "brick_slab" | "brick_stairs" => [150, 97, 83],
        "white_concrete" => [207, 213, 214],
        "gray_concrete" | "light_gray_concrete" => [125, 125, 115],
        "smooth_stone" | "smooth_stone_slab" => [158, 158, 158],
        "bedrock" => [85, 85, 85],
        "glass" | "glass_pane" => [200, 220, 230],
        "iron_block" => [220, 220, 220],
        "terracotta" => [152, 94, 67],
        "snow" | "snow_block" => [249, 254, 254],
        "ice" | "packed_ice" => [145, 183, 253],
        "clay" => [160, 166, 179],
        "sandstone" | "sandstone_slab" | "cut_sandstone" => [223, 214, 170],
        "red_sand" | "red_sandstone" => [190, 102, 33],
        "white_wool" | "white_carpet" => [234, 236, 237],
        "dirt_path" => [148, 121, 65],
        "farmland" => [143, 88, 46],
        _ => {
            // Fallback heuristic
            if short.contains("stone") { [128, 128, 128] }
            else if short.contains("dirt") || short.contains("mud") { [139, 90, 43] }
            else if short.contains("sand") { [219, 211, 160] }
            else if short.contains("grass") { [86, 125, 70] }
            else if short.contains("water") { [59, 86, 165] }
            else if short.contains("log") || short.contains("wood") { [101, 76, 48] }
            else if short.contains("leaves") { [55, 95, 36] }
            else if short.contains("planks") { [162, 130, 78] }
            else if short.contains("brick") { [150, 97, 83] }
            else if short.contains("concrete") { [128, 128, 128] }
            else if short.contains("wool") || short.contains("carpet") { [220, 220, 220] }
            else if short.contains("terracotta") { [152, 94, 67] }
            else { [160, 160, 160] }
        }
    }
}
