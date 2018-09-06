
extern crate termion;

use std::io::{self, Write, Stdout, stdout, stdin}; 
use std::process::exit;
use termion::input::TermRead;
use termion::event::Key;
use termion::raw::{IntoRawMode, RawTerminal};

struct Editor {
    stdout: RawTerminal<Stdout>,
    screenrows: u16,
    screencols: u16,
}

impl Editor {
    fn new() -> io::Result<Editor> {
        let stdout = stdout().into_raw_mode().unwrap();
        let (xsize, ysize) = termion::terminal_size().unwrap();

        Ok(Editor {
            stdout: stdout,
            screenrows: ysize,
            screencols: xsize,
        })
    }

    fn draw_rows(&mut self) {

        for y in 0..self.screenrows {
            write!(self.stdout, "~");

            if y < self.screenrows - 1 {
                write!(self.stdout, "\r\n");
            }
        }
    }


    fn refresh_screen(&mut self) {
        write!(self.stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));

        self.stdout.flush().unwrap();

        self.draw_rows();

        write!(self.stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));

    }

    fn process_keypress(&mut self) {
    
        let stdin = stdin();

        for c in stdin.keys() {
            let key = c.unwrap();
            match key {
                Key::Ctrl('q') => {
                    write!(self.stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));
                    exit(0);
                } ,

                _ => {}
            }
        }

    }
}


fn main() {

    let mut editor = Editor::new().unwrap();

    loop {
        editor.refresh_screen();
        editor.process_keypress();
    }

}
