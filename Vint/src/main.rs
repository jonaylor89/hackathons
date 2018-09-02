
extern crate termion;

use std::env;
use std::io::{ Write, stdout };
use termion::raw::IntoRawMode;

mod editor;

fn main() {

    let args = env::args().collect();
    let mut stdout = stdout().into_raw_mode().unwrap();

    let editor = editor::Editor::new();

    if args.length >= 2 {
        editor.open(args);
    } else {
        editor.open(None);
    }

    editor.set_status_message("HELP: Ctrl-S = save | Ctrl-Q = quit | Ctrl-F = find");

    loop {
        editor.refresh_screen();
        editor.process_keypress();
    }

}
