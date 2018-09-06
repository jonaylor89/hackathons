
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

    fn draw_rows(&mut self, buf: &mut String) {

        for y in 0..self.screenrows {

            if y == self.screenrows / 3 {
                let welcome = "Vint Editor";

                if welcome.len() > self.screencols as usize{
                    let (first_str, last_str) = welcome.split_at(self.screencols as usize);

                    let mut padding = (self.screencols as usize - first_str.len()) / 2;
                    if padding != 0 {
                        buf.push_str("~");
                        padding -= 1;
                    }

                    while padding != 0 {
                        padding -= 1;
                        buf.push_str(" ");
                    }

                    buf.push_str(first_str);

                } else {

                    let mut padding = (self.screencols as usize - welcome.len()) / 2;
                    if padding != 0 {
                        buf.push_str("~");
                        padding -= 1;
                    }

                    while padding != 0 {
                        padding -= 1;
                        buf.push_str(" ");
                    }

                    buf.push_str(welcome);
                }
            
            } else {
                buf.push_str("~");
            }

            buf.push_str(format!("{}", termion::clear::UntilNewline).as_str());

            if y < self.screenrows - 1 {
                buf.push_str("\r\n");
            }
        }
    }


    fn refresh_screen(&mut self) {

        let mut buf = String::new();

        buf.push_str(format!("{}", termion::cursor::Hide).as_str());
        buf.push_str(format!("{}", termion::cursor::Goto(1, 1)).as_str());

        self.draw_rows(&mut buf);

        buf.push_str(format!("{}", termion::cursor::Goto(1, 1)).as_str());
        buf.push_str(format!("{}", termion::cursor::Show).as_str());

        write!(self.stdout, "{}", buf);

    }

    fn process_keypress(&mut self) {
    
        let stdin = stdin();

        for c in stdin.keys() {
            let key = c.unwrap();
            match key {
                Key::Ctrl('q') => {
                    write!(self.stdout, "{}{}", termion::clear::All, termion::cursor::Goto(1, 1));
                    self.stdout.flush().unwrap();
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
