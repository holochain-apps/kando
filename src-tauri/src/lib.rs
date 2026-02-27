use holochain_types::prelude::AppBundle;
use std::path::PathBuf;
use tauri_plugin_holochain::{HolochainPluginConfig, HolochainExt, NetworkConfig, vec_to_locked};
use url2::Url2;
use tauri::{AppHandle, Listener, Manager};

const APP_ID: &'static str = "kando";
pub const HAPP_BUNDLE_BYTES: &'static [u8] = include_bytes!("../../workdir/kando.happ");

pub fn happ_bundle() -> anyhow::Result<AppBundle> {
    AppBundle::unpack(HAPP_BUNDLE_BYTES).map_err(|e| anyhow::anyhow!(e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_holochain::async_init(
            vec_to_locked(vec![]),
            HolochainPluginConfig::new(holochain_dir(), network_config())
        ))
        .setup(|app| {
            let handle = app.handle().clone();
            let handle_fail = app.handle().clone();
            app.handle()
                .listen("holochain://setup-failed", move |_event| {
                    handle_fail.exit(1);
                });
            app.handle()
                .listen("holochain://setup-completed", move |_event| {
                    let handle = handle.clone();
                    tauri::async_runtime::spawn(async move {
                        setup(handle.clone()).await.expect("Failed to setup");

                        let mut window = handle
                            .holochain()
                            .expect("Failed to get holochain")
                            .main_window_builder(
                                String::from("main"),
                                false,
                                Some(String::from("kando")),
                                None,
                            )
                            .await
                            .expect("Failed to build window");

                        #[cfg(desktop)]
                        {
                            window = window.title(String::from("Kando"));
                        }

                        window.build().expect("Failed to open main window");

                        #[cfg(desktop)]
                        {
                            if let Some(splashscreen) = handle.get_webview_window("splashscreen") {
                                let _ = splashscreen.close();
                            }
                        }
                    });
                });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Very simple setup for now:
// - On app start, list installed apps:
//   - If our hApp is not installed, this is the first time the app is opened: install our hApp
//   - If our hApp **is** installed:
//     - Check if it's necessary to update the coordinators for our hApp
//       - And do so if it is
async fn setup(handle: AppHandle) -> anyhow::Result<()> {
    let admin_ws = handle.holochain()?.admin_websocket().await?;

    let installed_apps = admin_ws
        .list_apps(None)
        .await
        .map_err(|err| tauri_plugin_holochain::Error::ConductorApiError(err))?;

    if installed_apps
        .iter()
        .find(|app| app.installed_app_id.as_str().eq(APP_ID))
        .is_none()
    {
        handle
            .holochain()?
            .install_app(
                String::from(APP_ID),
                happ_bundle()?,
                None,
                None,
                None,
            )
            .await?;
    } else {
        handle.holochain()?.update_app_if_necessary(
            String::from(APP_ID),
            happ_bundle()?
        ).await?;
    }

    Ok(())
}

fn network_config() -> NetworkConfig {
    let mut network_config = NetworkConfig::default();

    // Don't use the bootstrap service on tauri dev mode
    if tauri::is_dev() {
        network_config.bootstrap_url = Url2::parse("http://0.0.0.0:8888");
    }

    // Don't hold any slice of the DHT in mobile
    if cfg!(mobile) {
        network_config.target_arc_factor = 0;
    }

    network_config
}

fn holochain_dir() -> PathBuf {
    let app_data_type = if tauri::is_dev() {
        app_dirs2::AppDataType::UserCache
    } else {
        app_dirs2::AppDataType::UserData
    };

    app_dirs2::app_root(
        app_data_type,
        &app_dirs2::AppInfo {
            name: APP_ID,
            author: std::env!("CARGO_PKG_AUTHORS"),
        },
    )
    .expect("Could not get app root")
    .join("holochain")
}
