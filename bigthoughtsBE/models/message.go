package models

import (
	"encoding/json"

	"github.com/gobuffalo/pop"
	"github.com/gobuffalo/validate"
)

type Message struct {
	time_stamp int    `db:"time_stamp"`
	content    string `db:"content"`
	author     string `db:"author"`
	class_id   int    `db:"class_id"`
	message_id int    `db:"message_id"`
	user_id    string `db:"user_id"`
}

// String is not required by pop and may be deleted
func (m Message) String() string {
	jm, _ := json.Marshal(m)
	return string(jm)
}

// Messages is not required by pop and may be deleted
type Messages []Message

// String is not required by pop and may be deleted
func (m Messages) String() string {
	jm, _ := json.Marshal(m)
	return string(jm)
}

// Validate gets run every time you call a "pop.Validate*" (pop.ValidateAndSave, pop.ValidateAndCreate, pop.ValidateAndUpdate) method.
// This method is not required and may be deleted.
func (m *Message) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}

// ValidateCreate gets run every time you call "pop.ValidateAndCreate" method.
// This method is not required and may be deleted.
func (m *Message) ValidateCreate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}

// ValidateUpdate gets run every time you call "pop.ValidateAndUpdate" method.
// This method is not required and may be deleted.
func (m *Message) ValidateUpdate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}
