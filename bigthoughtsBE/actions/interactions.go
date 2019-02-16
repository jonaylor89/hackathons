package actions

import (
	"github.com/gobuffalo/buffalo"
)

//Takes parameter classID - ID of the class
// to get the members of
func GetClassMembers(c buffalo.Context) error {
	// []models.Person

	_, err := c.Response().Write([]byte("Hello World"))

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

	_, err := c.Response().Write([]byte("Hello World"))

	return err
}

//Takes parameter userID, returns first and last name of
// user assosciated with that ID
func GetNameByID(c buffalo.Context) error {
	//string

	_, err := c.Response().Write([]byte("Hello World"))

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
