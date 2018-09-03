
use std::time;
use std::io::{self, stdout, stdin, File, BufReader};
use termion::{self, color, style}
use termion::event::{Key, Event};

struct EditorRow {

}

struct Editor {
    cx: i32,
    cy: i32,
    rx: i32,
    rowoff: i32,
    coloff: i32,
    screenrows: i32,
    screencols: i32,
    numrows: i32,
    row: Option<erow>,
    dirty: i32,
    filename: &str,
    statusmsg: &str,
    statusmsg_time: Option<&time::Instant>,
};

impl Editor {
    pub fn new() -> Editor {
        let mut e = Editor {
            cx = 0,
            cy = 0,
            rx = 0,
            rowoff = 0,
            coloff = 0,
            numrows = 0,
            row = None,
            dirty = 0,
            filename = String::new(),
            statusmsg = String::new(),
            statusmsg_time = time::Instant::now(),
        };

        e.screenrows, e.screencols = termion::terminal_size().unwrap();

        return e;
    }

    pub fn open(self, filename: Option<String>) {
 
        if Some(filename) {
            let file = File::open(filename)?;
        } else {
            let file = File::new("untitled")?;  
        }

        let mut reader = BufReader::new(file);
        let mut line = String::new();
        let mut linelen = file.read_line(&mut line);

        while (linelen = file.read_line(&mut line)) != 0 {
            while linelen > 0 && (line.char_at(linelen-1) == '\n' || line.char_at[linelen-1] == '\r') {
                self.insert_row(line, linelen);
            }
        }

        self.dirty = 0;
    }

    pub fn refresh_screen(self) {
    
        self.scroll();

        let buf = String::new();

        buf.push_str("\x1b[?25l");
        buf.push_str("\x1b[H");

        self.draw_rows();
        self.draw_status_bar();
        self.draw_message_bar();

        buf.push_str(format!("\x1b[{};{}H", (self.cy - self.rowoff) + 1,
                                        (self.rw - self.coloff) + 1));
        buf.push_str("\x1b[?25h");

        stdout().write(buf.as_bytes());
    }

    pub fn process_keypress(self) {
        let stdin = stdin();

        
    }

    fn scroll(self) {
    
    }

    fn draw_rows(self) {
    
    }

    fn draw_status_bar(self) {
    
    }
}

