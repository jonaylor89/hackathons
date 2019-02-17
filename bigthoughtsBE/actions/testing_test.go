package actions

import (
	"testing"
)

func TestText(t *testing.T) {
	err := Text("+15404097366", "+15404862896", "Hey cutie")

	if err != nil {
		t.Errorf("Texting error: %v\n", err)
	}
}
