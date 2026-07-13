document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("case-form");

  if (!form) return;

  form.addEventListener("submit", (e) => {
    const text = Array.from(
      form.querySelectorAll("input, textarea")
    )
      .map((field) => field.value)
      .join(" ");

    const patterns = [
      /\b[SFTG]\d{7}[A-Z]\b/i, // NRIC
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // Email
      /\b\d{6}\b/, // OTP
      /(?:\d[ -]?){13,16}/, // Credit/Debit Card Number
      /password/i // Password keyword
    ];

    const found = patterns.some((pattern) => pattern.test(text));

    if (found) {
      const proceed = confirm(
        "🛡 Scam Patrol Alert!\n\n" +
        "We detected potentially sensitive information in your report.\n\n" +
        "Detected information may include:\n" +
        "• NRIC\n" +
        "• Email Address\n" +
        "• OTP\n" +
        "• Card Details\n" +
        "• Password Information\n\n" +
        "Sharing personal information may expose you to scams.\n\n" +
        "Do you want to continue anyway?"
      );

      if (!proceed) {
        e.preventDefault();
      }
    }
  });
});