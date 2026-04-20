# Pickup Point Courier Service Website

A modern, mobile-friendly website for **Pickup Point Courier Service**, where customers can place courier orders by sending a text message.  
The site includes sections for service details, terms of use, and employees with clickable **copy phone number** functionality.

---

## 📂 Project Structure

Pickup Point-website/
├── index.html # Main HTML file
├── style.css # Stylesheet
├── script.js # JavaScript for interactions
├── images/ # Employee profile photos and reload icon
│ ├── jane.jpg
│ ├── john.jpg
│ ├── emily.jpg
│ └── favicon.png
└── README.md # Project documentation


---

## 🚀 Features

- 📱 **Responsive Design** – Works seamlessly on desktop, tablet, and mobile.  
- 🔝 **Top Navigation Bar** – Collapses into a hamburger menu on mobile.  
- 🔄 **Reload Button** – Navbar favicon reloads the page when clicked.  
- ⚡ **How It Works** – Two steps side by side, with **“Fast Delivery”** centered below.  
- 📜 **Terms of Use** – Legal terms and conditions.  
- 👥 **Employees Section** – Employee profiles with photos, roles, and clickable phone numbers.  
- 📋 **Copy to Clipboard** – Tap a number to instantly copy it.  
- 🔔 **Toast Notifications** – Small popup confirms when numbers are copied.  
- 🚫 **No Auto-Linking of Phone Numbers** – Prevents mobile browsers from forcing numbers into call links.  
- 📲 **Manual Copy Backup** – Long-press on numbers to copy manually if JavaScript fails.  

---

## 🛠️ Setup Instructions

1. **Clone or download this repo**  
   ```bash
   git clone https://github.com/yourusername/Pickup Point-website.git

2. Open locally

   - Open index.html in your browser.

3. Customize employees

   - Replace images in the images/ folder.

   - Update names, roles, and numbers in index.html.

4. Customize reload icon

   - Replace favicon.png with your own logo/icon if desired.


🌐 Deployment (GitHub Pages)

1. Push this project to a GitHub repo.

2. Go to Settings → Pages.

3. Under Branch, select main and set folder to / (root).

4. Click Save.

5. Your site will be live at: https://yourusername.github.io/Pickup Point-website/


⚡ Notes

* Phone numbers are displayed as clickable spans (<span>) instead of <a href="tel:">, so mobile browsers won’t auto-link them.

* HTTPS required: Clipboard copying works best when the site is served over HTTPS (GitHub Pages, Netlify, Vercel all provide this free).

* Fallback support: If clipboard API isn’t available, users can long-press the number to copy manually.

* Custom branding: Update style.css to change colors, fonts, and navbar style.


📸 Preview

To add a screenshot of the site in action:

1. Open the site in your browser.

2. Capture a screenshot.

3. Save it in the project folder (e.g., preview.png).

4. Add this line to the README: ![Preview of Pickup Point Courier Service](preview.png)


📄 License

This project is licensed under the MIT License – feel free to use and modify it for your business.
