#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{App, AppHandle, Manager, WebviewWindow, WebviewWindowBuilder};

#[tauri::command]
fn fullscreen(window: WebviewWindow) -> tauri::Result<()> {
    let on = window.is_fullscreen()?;
    window.set_fullscreen(!on)
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn report(level: String, message: String) {
    eprintln!("page {level}: {message}");
}

fn open_window(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let config = app
        .config()
        .app
        .windows
        .first()
        .ok_or("tauri.conf.json defines no window")?
        .clone();
    let window = WebviewWindowBuilder::from_config(app.handle(), &config)?.build()?;
    if let Ok(query) = std::env::var("SPACE4X_QUERY") {
        let mut url = window.url()?;
        url.set_query(Some(&query));
        window.navigate(url)?;
    }
    eprintln!(
        "window open, storage in {}",
        app.path().app_local_data_dir()?.display()
    );
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fullscreen, quit, report])
        .setup(open_window)
        .run(tauri::generate_context!())
        .expect("Space4x could not start");
}
