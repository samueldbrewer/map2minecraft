pub mod args;
#[cfg(feature = "bedrock")]
pub mod bedrock_block_map;
pub mod block_definitions;
pub mod bresenham;
pub mod clipping;
pub mod colors;
pub mod coordinate_system;
pub mod data_processing;
pub mod deterministic_rng;
pub mod element_processing;
pub mod elevation_data;
pub mod floodfill;
pub mod floodfill_cache;
pub mod ground;
pub mod map_renderer;
pub mod map_transformation;
pub mod osm_parser;
#[cfg(feature = "gui")]
pub mod progress;
pub mod retrieve_data;
#[cfg(feature = "gui")]
pub mod telemetry;
#[cfg(test)]
pub mod test_utilities;
pub mod urban_ground;
pub mod version_check;
pub mod world_editor;
pub mod world_utils;

#[cfg(feature = "gui")]
pub mod gui;

// If the user does not want the GUI, it's easiest to just mock the progress module to do nothing
#[cfg(not(feature = "gui"))]
pub mod progress {
    pub fn emit_gui_error(_message: &str) {}
    pub fn emit_gui_progress_update(_progress: f64, _message: &str) {}
    pub fn emit_map_preview_ready() {}
    pub fn emit_open_mcworld_file(_path: &str) {}
    pub fn is_running_with_gui() -> bool {
        false
    }
}
