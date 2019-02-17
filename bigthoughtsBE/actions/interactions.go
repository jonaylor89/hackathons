package actions
import (
		"log"

		"github.com/gobuffalo/buffalo"
		"github.com/desertbit/glue"
       )

func StartWebSocketServer() {
	// Create a new glue server.
server := glue.NewServer(glue.Options{
HTTPListenAddress: "ws://localhost:8080/sockjs-node/218/oinu33eb/websocket",
})

// Release the glue server on defer.
// This will block new incoming connections
// and close all current active sockets.
defer server.Release()

	// Set the glue event function to handle new incoming socket connections.
server.OnNewSocket(onNewSocket)

	// Run the glue server.
	err := server.Run()
	if err != nil {
		log.Fatalf("Glue Run: %v", err)
	}
}

func onNewSocket(s *glue.Socket) {
    // Set a function which is triggered as soon as the socket is closed.
    s.OnClose(func() {
        log.Printf("socket closed with remote address: %s", s.RemoteAddr())
    })

    // Set a function which is triggered during each received message.
    s.OnRead(func(data string) {
        // Echo the received data back to the client.
        s.Write(data)
    })

    // Send a welcome string to the client.
    s.Write("Hello Client")
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
