package actions

import (
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func Updater(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer c.Close()
	for {

		mt, _, _ := c.ReadMessage()

		if err != nil {
			break
		}

		err = c.WriteMessage(mt, []byte("You're gay"))
		if err != nil {
			break
		}
	}
}
