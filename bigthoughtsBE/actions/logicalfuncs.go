package actions

import (
	"encoding/json"
	"fmt"

	"github.com/bigthoughts/models"
)

//Takes parameter classID - ID of the class
// to get the members of
func GetClassMembersLogical(classID int) []models.Person {
	members := []models.Person{}
	rows := models.DB.RawQuery("select * from person where user_id in (select distinct user_id from message where class_id = ?);", classID)

	rows.All(&members)
	return members
}

//Takes parameters num, classID, userID, offset
//	num - number of messages to retrieve
//	classID - class ID of messages to retrieve
//	userID - student ID of messages to retrieve
//	offset - where in the history to start retrieving from
func GetMessageHistLogical(classID int, userID string) string {
	//messages := []models.Message{}
	//fmt.Print(userID)
	//fmt.Print("\n")
	//query := models.DB.RawQuery("select * from message;")
	//right_user := query.Where("user_id like $1", userID)
	//right_user.All(&messages)
	//return messages
	fmt.Print(userID)
	p := []models.Message{}
	rows := models.DB.RawQuery("select * from message where user_id like ? and class_id = ?", userID, classID)
	//user := rows.Where("user_id like ? and class_id = ?", userID, classID)
	rows.All(&p)
	js, _ := json.Marshal(p)
	return string(js)
}

//Takes parameter userID, returns first and last name of
// user assosciated with that ID
func GetNameByIDLogical(userID string) models.Person {
	fmt.Print(userID)
	p := models.Person{}
	rows := models.DB.RawQuery("select * from person where user_id like ?;", userID)
	rows.First(&p)
	return p
}

//Takes parameters content, author, classID, and userID
//	content - content of message
//	author - userID of author of message
//	classID - ID of class message was sent in
//	userID - userID of student message was in regards to
// author and userID are equal if author is student in question
func SendMessageLogical(content, author, userID string, classID int) {

}

//Takes parameter taid, the userID of the TA
//func PopulateDataForTALogical(c buffalo.Context) models.SuperDuperMegaContainer {
//	return models.SuperDuperMegaContainer{}
//}
