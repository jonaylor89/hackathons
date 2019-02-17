package actions

import (
	"log"
	"net/http"

	"github.com/gobuffalo/buffalo"
	socketio "github.com/googollee/go-socket.io"
)

var server socketio.Server

func StartWebSocketServer() {
	var err error
	server, err = socketio.NewServer(nil)
	if err != nil {
		log.Fatal(err)
	}
	server.On("connection", func(so socketio.Socket) {
		log.Println("on connection")
		so.Join("chat")

		so.On("chat message", func(msg string) {
			log.Println("emit:", so.Emit("chat message", msg))
			server.BroadcastTo("chat", "chat message", msg)
		})
		so.On("disconnection", func() {
			log.Println("on disconnect")
		})
	})
	server.On("error", func(so socketio.Socket, err error) {
		log.Println("error:", err)
	})

	http.Handle("/", server)
	log.Println("Serving web socket connection at localhost:5000...")
	http.ListenAndServe(":5000", nil)
}

//Takes parameter classID - ID of the class
// to get the members of
func GetClassMembers(c buffalo.Context) error {
	// []models.Person

	_, err := c.Response().Write([]byte(GetClassMembersLogical(1)[0].String()))

	return err
}

//Takes parameter TAID teachers assistant ID
func GetClassList(c buffalo.Context) error {
	// []models.Class

	_, err := c.Response().Write([]byte("Hello World"))

	return err
}

//Takes parameters num, classID, userID, offset
//	num - number of messages to retrieve
//	classID - class ID of messages to retrieve
//	userID - student ID of messages to retrieve
//	offset - where in the history to start retrieving from
func GetMessageHist(c buffalo.Context) error {
	// []models.Message

	_, err := c.Response().Write([]byte(GetMessageHistLogical(1, c.Param("userID"))[0].String()))

	return err
}

//Takes parameter userID, returns first and last name of
// user assosciated with that ID
func GetNameByID(c buffalo.Context) error {
	//string

	_, err := c.Response().Write([]byte(GetNameByIDLogical(c.Param("userID")).String()))

	return err
}

//Takes parameters content, author, classID, and userID
//	content - content of message
//	author - userID of author of message
//	classID - ID of class message was sent in
//	userID - userID of student message was in regards to
// author and userID are equal if author is student in question
func SendMessage(c buffalo.Context) error {

	_, err := c.Response().Write([]byte("Hello World"))

	return err
}

//Takes parameter taid, the userID of the TA
func PopulateDataForTA(c buffalo.Context) error {
	// models.SuperDuperMegaContainer

	_, err := c.Response().Write([]byte("Hello World"))

	return err
}
