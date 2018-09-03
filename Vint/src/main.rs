
extern crate termion;

mod editor

use std::env;

fn main() {

    let args = env::args().collect();
    let editor = editor::Editor::init();

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
