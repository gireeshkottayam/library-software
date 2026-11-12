# Public Library Kooroppada - Comprehensive User Manual
## End-to-End Operational Guide v1.0.3

---

## 1. Introduction
Welcome to the **Public Library Kooroppada Management System**. This software is a professional-grade, locally-hosted solution designed to streamline book management, member tracking, and automated communication.

### System Requirements:
*   **Operating System:** Windows 10/11 (64-bit)
*   **Hardware:** 4GB RAM, 500MB Disk Space
*   **Peripherals:** Webcam (for QR scanning), Printer (for ID cards/reports)

---

## 2. Getting Started
### 2.1 Installing or upgrading
1.  Close the library software if it is open.
2.  Run `KPL_Setup_v1.0.3.exe`.
3.  The setup checks the computer first. If an earlier copy of the software is
    found, it reports the version and the folder it found and upgrades that
    copy in place — you never end up with two installations.
4.  Choose the installation folder (the previous folder is offered again) and
    click **Install**.
5.  The last page reads **"Installation completed successfully"** and offers to
    open the software. Your books, members, fees and settings are preserved.

### 2.2 Activation
Upon the first launch, the software will enter **Trial Mode**. To activate:
1.  Navigate to **Settings > License**.
2.  Copy your **Hardware ID**.
3.  Send the ID to the Administrator to receive your **Serial Key**.
4.  Paste the key and click **Activate Now**.

### 2.3 First Login
*   **Default Username:** `admin`
*   **Default Password:** `admin123`
*   *Note: Change your password immediately in Settings > Users.*

---

## 3. Dashboard (Home)
The Dashboard provides a 360-degree view of your library’s health.
*   **Total Books:** Count of all titles in the database.
*   **Active Members:** Total registered members.
*   **Books Issued:** Number of books currently out with members.
*   **Overdue Now:** Critical list of books past their due date.
*   **Analytics Chart:** Weekly trend of library activity.

---

## 4. Book Management
The **Books** tab is where you manage your inventory.
*   **Adding/Editing a Book:** Click `Add New` or click the edit icon on an existing book. Fill in the Title, Title (Malayalam), Author, Translator, Category, ISBN, and Publisher.
*   **Author Selection:** The **Author** field lists every author already saved in the library. Pick a name from the list instead of retyping it. Use the **+** button beside the field to add a new author without leaving the form.
*   **Duplicate Author Check:** When a new author name looks like an existing one, the app lists the closest matches with a similarity score. Choose **Merge into** to reuse the existing name (books using the new name are rewritten to it), or **Keep both** to store the names separately.
*   **Amount:** Enter the book's amount in rupees in the **Amount (₹)** field. The value is saved with the book and shown in the Books list. Leave the field blank when the amount is not known, and type `0` for a book that is given away free. Amounts accept up to two decimal places.
*   **Amounts of books added in older versions:** versions 1.0.0 and 1.0.1 never saved the price, so those amounts cannot be brought back automatically. Such books show a **Set amount** button in the Amount column, and the top of the page shows how many books still miss an amount. Click **Set amounts** to open a list of those books, type the amount of each one and press `Enter` to move to the next book, then press **Save Amounts**. The list shows the amount from then on; a book marked free shows `Free`.
*   **Translator Field:** Essential for books translated from other languages to Malayalam. The translator's name will display underneath the author in the books table list.
*   **AI Cover Page Scanner (OCR & Autofill):**
    1. Click the `📸 Auto-Scan Book` button inside the Add Book modal.
    2. **Webcam Scan:** Select your webcam device, hold the book cover in front of the camera, and click `Capture & Scan`.
    3. **File Scan:** Alternatively, click the file upload area or drag-and-drop a book cover image file.
    4. **OCR Languages:** Supports both English and Malayalam (`eng+mal`) OCR.
    5. **Online Lookup:** After OCR extracts text, the system automatically queries Google Books and Open Library APIs to find matching book details. Select the best match to automatically fill in the Title, Author, Publisher, Category, and ISBN.
    6. **Interactive Text Fallback:** If no online match is found, all recognized lines of text are listed. You can click on any text line and choose a field (e.g., Title, Author, Translator, ISBN) to instantly assign that text to the field!
*   **Categories:** Use the dropdown to select genres (Fiction, Science, Malayalam Literature, etc.).
*   **Stock Management:** The system tracks `Available` vs `Total` stock automatically.
*   **Searching:** Use the search bar to find books by Title, Author, Translator, or ISBN instantly.

---

## 5. Member Management
The **Members** tab handles your library's community.
*   **Registration:** Click `Add New`. Capture member details including Phone and Address.
*   **Photo Capture:** You can upload or crop member photos for professional ID cards.
*   **Member ID Cards:** Click the `ID Card` button on any member row to generate a high-quality, printable ID card with a unique QR code.
*   **Fine Collection:** View a member's profile to see unpaid fines and collect payments.

---

## 6. Issue & Return (Circulation)
This is the heart of the daily operations.
### 6.1 Issuing a Book
1.  Search for the **Member** (Name or ID).
2.  Search for the **Book**.
3.  Click `Issue Book`.
4.  The system calculates the **Due Date** based on library rules.

### 6.2 Returning a Book
1.  Use the **QR Scanner** (click the Scanner icon) to scan the Member's ID card.
2.  The system will list all books currently held by that member.
3.  Click `Return` on the appropriate book.
4.  If the book is overdue, the system will automatically calculate and apply the **Fine**.

---

## 7. Automated WhatsApp Notifications
The system features a **Local WhatsApp Bridge** for free, unlimited alerts.
### 7.1 Setup
1.  Go to **Settings > Notifications**.
2.  Click **Connect WhatsApp**.
3.  Scan the QR code with your library's smartphone.
### 7.2 Automation
*   **Borrowing:** Sends a message with the book title and due date.
*   **Return:** Sends a confirmation and fine receipt.
*   **Registration:** Sends a welcome message with the Reg No.
*   *Note: Ensure "Automatic Sending" is toggled ON.*

---

## 8. Reports & Analytics
The **Reports** tab allows you to export data for administrative review.
*   **Borrowing History:** Track who took which book and when.
*   **Financial Reports:** Summary of all registration fees and fines collected.
*   **Export:** All reports can be downloaded as **PDF** files for printing or archiving.

---

## 9. System Settings
Configure the software to match your library's specific needs.
*   **Library Info:** Set your name, address, and upload the Secretary's signature.
*   **Borrowing Rules:** Set the borrowing period (e.g., 14 days) and fine amount (e.g., Rs.2/day).
*   **Backup & Restore:** Use the **Backup** feature daily to protect your data. Store backups on a USB drive.
*   **Restoring a backup:** Go to **Settings → Backup → Restore from Backup**, pick the backup file and confirm. The software replaces the current data with the backup and restarts. A safety backup of the data that is there now is kept automatically, so nothing is lost for good.
*   **What the restore did:** After the restart the software shows how many books came back and how many of them have no amount. The message is shown only once.
*   **A warning before the restore:** The confirmation tells you how many books the backup holds and how many of them have an amount. If the backup was taken with a version that never saved the price, the warning says so, because the amounts you entered now would be replaced by the missing ones.
*   **Getting back to the last good state:** **Settings → Backup → Restore the newest automatic backup** puts the most recent automatic backup back in place. Use it when something was changed by mistake.
*   **Books still show "Set amount" after a restore:** The backup was taken with a version that did not save the price, so those amounts are not inside the file. Use **Set amounts** on the Books page to type them in once. The editor saves every amount right away, has a search field and shows how many books are still open.

---

## 10. Troubleshooting
*   **Scanner not working:** Ensure your webcam is connected and the browser has permission to access it.
*   **Books show "Set amount":** The book was added in a version that did not save the price, so the amount is not on record. Use **Set amounts** on the Books page to type it in once.
*   **WhatsApp disconnected:** Re-scan the QR code in Settings if your phone was offline for too long.
*   **Database Backup:** If you move the software to a new computer, use the **Restore** feature in Settings to bring back all your data.
*   **A restore did nothing:** Close the software, open it again and restore the backup once more. A restore is refused while another copy of the software has the database open.

---
(c) 2026 Public Library Kooroppada. All rights reserved.
