/**
 * WhatsApp Notification Service for Kooroppada Library
 * Handles message generation and delivery via wa.me protocol
 */

const TEMPLATES = {
  registration: {
    en: (m) => `Welcome to Public Library Kooroppada! Your Registration No. is ${m.reg_no}. Thank you for joining us.`,
    ml: (m) => `പൊതുജന ഗ്രന്ഥശാല കൂരോപ്പടയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ രജിസ്ട്രേഷൻ നമ്പർ ${m.reg_no} ആണ്. ഞങ്ങളോടൊപ്പം ചേർന്നതിന് നന്ദി.`
  },
  borrow: {
    en: (m, d) => `Hello ${m.full_name}, you have successfully borrowed '${d.book}'. Due Date: ${d.due_date}. Please return on time to avoid fines. Thank you.`,
    ml: (m, d) => `നമസ്കാരം ${m.full_name}, നിങ്ങൾ '${d.book}' എന്ന പുസ്തകം കൊണ്ടുപോയിരിക്കുന്നു. തിരിച്ചടയ്ക്കേണ്ട തീയതി: ${d.due_date}. പിഴ ഒഴിവാക്കാൻ കൃത്യസമയത്ത് തിരിച്ചേൽപ്പിക്കുക. നന്ദി.`
  },
  return: {
    en: (m, d) => `Hello ${m.full_name}, '${d.book}' has been returned successfully. ${d.fine > 0 ? `Fine Paid: ₹${d.fine}.` : ''} Thank you.`,
    ml: (m, d) => `നമസ്കാരം ${m.full_name}, നിങ്ങൾ '${d.book}' എന്ന പുസ്തകം തിരിച്ചേൽപ്പിച്ചു. ${d.fine > 0 ? `അടച്ച പിഴ: ₹${d.fine}.` : ''} നന്ദി.`
  },
  fee: {
    en: (m, d) => `Hello ${m.full_name}, we have received ₹${d.amount} towards ${d.type}. Thank you.`,
    ml: (m, d) => `നമസ്കാരം ${m.full_name}, ${d.type} ഇനത്തിൽ ₹${d.amount} ലഭിച്ചു. നന്ദി.`
  }
};

/**
 * Sends a WhatsApp message (Automated via API or Manual via wa.me)
 * @param {Object} member - Member object { phone, full_name, reg_no }
 * @param {string} type - Notification type (registration, borrow, return, fee)
 * @param {Object} data - Additional data required for the template
 * @param {Object} config - { language, settings }
 */
export async function sendWhatsAppNotification(member, type, data = {}, config = {}) {
  const { language = 'en', settings = {} } = config;

  if (!member || !member.phone) {
    console.warn('Cannot send WhatsApp: Member phone missing');
    return false;
  }

  // Check if this notification type is enabled
  if (type === 'registration' && settings.notify_registration === '0') return false;
  if ((type === 'borrow' || type === 'return') && settings.notify_borrowing === '0') return false;

  // Clean phone number (remove non-digits, ensure country code)
  let phone = member.phone.replace(/\D/g, '');
  if (phone.length === 10) phone = '91' + phone; // Default to India if 10 digits

  const template = TEMPLATES[type];
  if (!template) {
    console.error(`Unknown notification type: ${type}`);
    return false;
  }

  const message = template[language](member, data);
  const isAuto = settings.whatsapp_auto_send === '1';

  if (isAuto) {
    // A. Local Bridge (Free/Unlimited)
    if (settings.whatsapp_provider === 'local' || !settings.whatsapp_provider) {
      try {
        console.log('Sending via Local WhatsApp Bridge...');
        const res = await window.api.sendWhatsApp(phone, message);
        if (res.success) {
          console.log('✅ Local WhatsApp sent successfully');
          return true;
        }
        throw new Error(res.message || 'Local bridge failure');
      } catch (err) {
        console.error('❌ Local Bridge failed:', err);
      }
    }

    // B. Ultramsg (Cloud API)
    if (settings.whatsapp_provider === 'ultramsg' && settings.whatsapp_instance_id && settings.whatsapp_token) {
      try {
        console.log('Sending via Ultramsg Cloud API...');
        const endpoint = `https://api.ultramsg.com/${settings.whatsapp_instance_id}/messages/chat`;
        const params = new URLSearchParams({
          token: settings.whatsapp_token,
          to: phone,
          body: message,
          priority: '10'
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        const resData = await response.json();
        if (resData.sent === 'true' || resData.success) {
          console.log('✅ Ultramsg WhatsApp sent successfully');
          return true;
        }
      } catch (err) {
        console.error('❌ Ultramsg failed:', err);
      }
    }
  }

  // Manual fallback (wa.me)
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phone}?text=${encodedMessage}`;
  window.open(url, '_blank');
  return true;
}
