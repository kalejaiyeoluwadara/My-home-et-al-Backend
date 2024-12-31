const nodemailer = require("nodemailer");

async function sendPaymentNotification(userDetails, paymentDetails) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: `"Shop Notification" <${process.env.ADMIN_EMAIL}>`, // Sender address
      to: process.env.ADMIN_EMAIL,
      subject: "New Payment Received",
      html: `
        <h2>Payment Notification</h2>
        <p>A user has successfully paid for an item.</p>
        <h3>User Details:</h3>
        <ul>
          <li>Name: ${userDetails.name}</li>
          <li>Email: ${userDetails.email}</li>
        </ul>
        <h3>Payment Details:</h3>
        <ul>
          <li>Amount: ${paymentDetails.amount}</li>
          <li>Transaction ID: ${paymentDetails.transactionId}</li>
          <li>Payment Date: ${paymentDetails.date}</li>
        </ul>
        <p>Kindly review this transaction in your dashboard.</p>
      `,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Example usage
const userDetails = {
  name: "John Doe",
  email: "john.doe@example.com",
};

const paymentDetails = {
  amount: "$100",
  transactionId: "TX123456789",
  date: new Date().toLocaleString(),
};

sendPaymentNotification(userDetails, paymentDetails);
