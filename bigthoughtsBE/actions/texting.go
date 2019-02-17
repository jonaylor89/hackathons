package actions

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gobuffalo/buffalo"
)

var (
	AccountSid   = os.Getenv("TWILIO_ACCOUNT_SID")
	AuthToken    = os.Getenv("TWILIO_AUTH_TOKEN")
	UrlStr       = "https://api.twilio.com/2010-04-01/Accounts/" + AccountSid + "/Messages.json"
	TwilioNumber = "+15404862896"
)

func Text(To, msg string) error {

	// Build out the data for our message
	v := url.Values{}
	v.Set("To", To)
	v.Set("From", TwilioNumber)
	v.Set("Body", msg)
	rb := *strings.NewReader(v.Encode())

	// Create client
	client := &http.Client{}

	req, err := http.NewRequest("POST", UrlStr, &rb)
	if err != nil {
		return err
	}
	req.SetBasicAuth(AccountSid, AuthToken)
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	// Make request
	resp, _ := client.Do(req)
	log.Println(resp.Status)

	return nil
}

func IncomingMsgHandler(c buffalo.Context) {
	// TODO
}
