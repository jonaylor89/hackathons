
extern crate termion;

use std::env;
use std::io::{ Write, stdout };
use termion::raw::IntoRawMode;

mod vint;

fn main() {

    let args = env::args().collect();
    let mut stdout = stdout().into_raw_mode().unwrap();

    let editor = vint::Editor::new();

    if args.length >= 2 {
        editor.editor_open(args);
    } else {
        editor.editor_open(None);
    }

    editor.set_status_message("HELP: Ctrl-S = save | Ctrl-Q = quit | Ctrl-F = find");

    loop {
        editor.refresh_screen();
        editor.process_keypress();
    }

}
