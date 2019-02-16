package models

import (
	"encoding/json"

	"github.com/gobuffalo/pop"
	"github.com/gobuffalo/validate"
)

type ClassTum struct {
	class_id int    `db:"class_id"`
	ta_id    string `db:"ta_id"`
}

// String is not required by pop and may be deleted
func (c ClassTum) String() string {
	jc, _ := json.Marshal(c)
	return string(jc)
}

// ClassTums is not required by pop and may be deleted
type ClassTums []ClassTum

// String is not required by pop and may be deleted
func (c ClassTums) String() string {
	jc, _ := json.Marshal(c)
	return string(jc)
}

// Validate gets run every time you call a "pop.Validate*" (pop.ValidateAndSave, pop.ValidateAndCreate, pop.ValidateAndUpdate) method.
// This method is not required and may be deleted.
func (c *ClassTum) Validate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}

// ValidateCreate gets run every time you call "pop.ValidateAndCreate" method.
// This method is not required and may be deleted.
func (c *ClassTum) ValidateCreate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}

// ValidateUpdate gets run every time you call "pop.ValidateAndUpdate" method.
// This method is not required and may be deleted.
func (c *ClassTum) ValidateUpdate(tx *pop.Connection) (*validate.Errors, error) {
	return validate.NewErrors(), nil
}
