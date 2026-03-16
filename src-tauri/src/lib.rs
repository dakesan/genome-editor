mod commands;
mod state;

use state::AppState;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::file::open_file,
            commands::file::save_file,
            commands::enzyme::compute_cut_sites,
            commands::enzyme::get_enzyme_names,
            commands::orf::detect_orfs,
            commands::alignment::align_sequences,
        ])
        .setup(|app| {
            // Build native menu bar.
            let open_item = MenuItemBuilder::with_id("open", "Open…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let save_item = MenuItemBuilder::with_id("save", "Save As…")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;

            let file_submenu = SubmenuBuilder::new(app, "File")
                .items(&[&open_item, &save_item])
                .separator()
                .close_window()
                .build()?;

            let edit_submenu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;

            let view_submenu = SubmenuBuilder::new(app, "View").fullscreen().build()?;

            let menu = MenuBuilder::new(app)
                .items(&[&file_submenu, &edit_submenu, &view_submenu])
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events.
            app.on_menu_event(move |app, event| match event.id().as_ref() {
                "open" => {
                    let _ = app.emit("menu-open-file", ());
                }
                "save" => {
                    let _ = app.emit("menu-save-file", ());
                }
                _ => {}
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
