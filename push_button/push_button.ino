const int buttonPin = 7;

int buttonState = HIGH;
int lastButtonState = HIGH;
bool toggleState = false;

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT_PULLUP);
}

void loop() {
  buttonState = digitalRead(buttonPin);

  if (lastButtonState == HIGH && buttonState == LOW) {
    toggleState = !toggleState;

    if (toggleState) {
      Serial.println("ON");
    } else {
      Serial.println("OFF");
    }
  }

  lastButtonState = buttonState;
  delay(50);
}