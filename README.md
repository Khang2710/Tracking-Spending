<img width="2888" height="1723" alt="image" src="https://github.com/user-attachments/assets/bec49653-ef1e-4a29-8051-fe66450ca645" /># 💰 Wealthy - Finance & Split Bill Tracking

![UI Preview](![Uploading Capture-2026-08-10-110056.png…]()) 



## 📖 About the Project
**Wealthy (Tracking Spending)** is a modern Web Application designed to help users manage personal finances and solve the headache of group expenses (Split Bills) intelligently. 

The standout feature of this project is the integration of **Artificial Intelligence (AI OCR)** to automatically read and extract data from receipt images, seamlessly calculating debts for each individual. The application features a premium **Bento Grid OLED Dark & Gold Luxe** design system, ensuring a minimalist, fluid, and high-end user experience.

## ✨ Key Features

*   🧾 **Smart AI Receipt OCR:** Snap a photo or upload a receipt image. The AI automatically parses dish names and exact prices, eliminating manual entry and formatting errors.
*   🤝 **Advanced Bill Splitting:** Assign specific dishes to specific individuals, auto-calculate taxes, tips, and generate a detailed debts distribution breakdown.
*   📊 **Management Dashboard:** Track your total balance, cash flows, and categorical spending with intuitive visual charts.
*   🌍 **Multi-Currency Support:** Seamlessly track and convert currencies (VND/USD).
*   📱 **Cross-Device Sync:** Data is synchronized in real-time on the cloud, ensuring a smooth experience across both desktop and mobile web.

## 🛠️ Tech Stack

### Frontend
*   **Core:** React.js, Vite
*   **Styling:** Tailwind CSS (Featuring an `#09090B` OLED black theme with Champagne Gold accents)
*   **Motion:** Framer Motion (for fluid transitions and micro-interactions)

### Backend
*   **Framework:** Java Spring Boot
*   **ORM:** Spring Data JPA / Hibernate
*   **Database:** PostgreSQL (Hosted on the cloud via **Supabase**)

### Integrations
*   **OpenAI API:** Utilized for computer vision capabilities to extract structured JSON data from raw receipt images.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16 or higher)
*   Java JDK 17 (or newer)
*   Maven
*   A Supabase (PostgreSQL) account and an OpenAI API Key.

### 1. Backend Setup (Spring Boot)
1. Navigate to the backend directory: `cd backend`
2. Create a `.env` file in the backend root directory and add your database credentials:
   ```env
   DB_PASSWORD=your_supabase_database_password
