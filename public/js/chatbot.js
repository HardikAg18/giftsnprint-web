// chatbot.js — GiftsNPrint AI Assistant
const BOT_NAME = 'PrintBot';
const WHATSAPP_NUM = '918769558589';

const FAQ = [
  { patterns: ['hello','hi','hey','good morning','good evening'], response: `Hey there! 👋 Welcome to <strong>GiftsNPrint</strong>! I'm ${BOT_NAME}, your printing assistant. How can I help you today?`, buttons: ['Products','Pricing','My Order','Contact Us'] },
  { patterns: ['product','what do you','offer','print','gift'], response: `We offer a wide range of custom printing services:<br>🎨 <strong>Custom Printing</strong> – T-shirts, mugs, banners<br>🎁 <strong>Corporate Gifts</strong> – Branded merchandise<br>🏆 <strong>Awards & Trophies</strong> – Custom engraving<br>📣 <strong>Promotional Items</strong> – Bulk orders<br>⚙️ <strong>Advanced Printing</strong> – UV, 3D, specialty`, buttons: ['View Products','Get Quote','Pricing'] },
  { patterns: ['price','cost','rate','how much','pricing','charges'], response: `Our pricing is <strong>quantity-based</strong> — the more you order, the less you pay per unit! 💰<br><br>📦 Minimum order: <strong>25 units</strong><br>💸 Price drops significantly at 50, 100, 250+ units<br><br>Visit any product page to see the full pricing table.`, buttons: ['View Products','Get Quote','WhatsApp Us'] },
  { patterns: ['order','track','status','my order'], response: `To track your order, please enter your <strong>Order ID</strong> on our order tracking page. 📦<br><br>You can also WhatsApp us with your order ID for instant updates!`, buttons: ['Track Order','WhatsApp Us'] },
  { patterns: ['deliver','shipping','days','time'], response: `🚚 Delivery timelines:<br>• Standard: <strong>5-7 working days</strong><br>• Express: <strong>2-3 working days</strong><br>• Bulk orders: <strong>7-10 working days</strong><br><br>Free shipping on orders above ₹1,000!`, buttons: ['Place Order','Contact Us'] },
  { patterns: ['contact','phone','call','email','address'], response: `📞 <strong>+91 87695 58589</strong><br>📧 info.giftsnprint@gmail.com<br>📍 Jaipur, Rajasthan<br><br>Or chat with us on WhatsApp for fastest response!`, buttons: ['WhatsApp Us','Contact Page'] },
  { patterns: ['minimum','min order','moq'], response: `Our <strong>Minimum Order Quantity (MOQ)</strong> is <strong>25 units</strong> for most products. Some premium items start at 10 units. Bulk discounts apply from 50+ units! 🎉`, buttons: ['Get Quote','View Products'] },
  { patterns: ['payment','pay','razorpay','upi','card'], response: `We accept all payment methods: 💳<br>• UPI (GPay, PhonePe, Paytm)<br>• Credit/Debit Cards<br>• Net Banking<br>• Powered by <strong>Razorpay</strong> — 100% secure!`, buttons: ['Place Order'] },
  { patterns: ['quote','estimate','bulk'], response: `For a custom quote, please fill out our <strong>Quote Request Form</strong> with your product, quantity, and design details. We'll respond within <strong>2 hours</strong>! ⚡`, buttons: ['Get Quote','WhatsApp Us'] },
  { patterns: ['design','artwork','file','upload'], response: `We accept: 🎨<br>• <strong>PDF, AI, EPS</strong> (preferred for print)<br>• <strong>PNG, JPG</strong> (300 DPI minimum)<br>• <strong>PSD, CDR</strong> files<br><br>Need design help? Our team offers free design assistance!`, buttons: ['Get Quote','WhatsApp Us'] },
  { patterns: ['whatsapp','chat','message'], response: `Opening WhatsApp... 💬 Our team is available <strong>Mon–Sat, 9AM–7PM</strong>.`, action: 'whatsapp', buttons: [] },
];

function matchFAQ(input) {
  const lower = input.toLowerCase();
  for (const faq of FAQ) {
    if (faq.patterns.some(p => lower.includes(p))) return faq;
  }
  return null;
}

function addMessage(text, sender = 'bot', buttons = []) {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;
  const msg = document.createElement('div');
  msg.className = `chat-msg ${sender}`;
  msg.innerHTML = text;
  messages.appendChild(msg);

  if (buttons.length) {
    const btns = document.createElement('div');
    btns.className = 'chat-buttons';
    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'chat-btn';
      btn.textContent = b;
      btn.onclick = () => handleUserInput(b);
      btns.appendChild(btn);
    });
    messages.appendChild(btns);
  }
  messages.scrollTop = messages.scrollHeight;
}

function handleUserInput(input) {
  addMessage(input, 'user');
  const matched = matchFAQ(input);

  setTimeout(() => {
    if (matched) {
      if (matched.action === 'whatsapp') {
        window.open(`https://wa.me/${WHATSAPP_NUM}?text=Hello! I need assistance.`, '_blank');
      }
      addMessage(matched.response, 'bot', matched.buttons);
    } else {
      addMessage(`I'm not sure about that. Let me connect you with our team! 😊`, 'bot', ['WhatsApp Us', 'Contact Page', 'View Products']);
    }
  }, 400);
}

function handleButtonAction(label) {
  const actions = {
    'View Products': () => window.location.href = '/products.html',
    'Get Quote': () => window.location.href = '/quote.html',
    'WhatsApp Us': () => window.open(`https://wa.me/${WHATSAPP_NUM}?text=Hello! I need assistance.`, '_blank'),
    'Contact Page': () => window.location.href = '/contact.html',
    'Place Order': () => window.location.href = '/products.html',
    'Track Order': () => window.location.href = '/contact.html#track',
  };
  if (actions[label]) actions[label]();
  else handleUserInput(label);
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('chatbotToggle');
  const box = document.getElementById('chatbotBox');
  const closeBtn = document.getElementById('chatbotClose');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');

  toggle?.addEventListener('click', () => {
    box?.classList.toggle('open');
    if (box?.classList.contains('open') && !document.getElementById('chatMessages')?.children.length) {
      setTimeout(() => addMessage(`👋 Hi! I'm <strong>${BOT_NAME}</strong>, GiftsNPrint's virtual assistant!<br>How can I help you today?`, 'bot', ['Products', 'Pricing', 'Contact Us', 'Get Quote']), 300);
    }
  });

  closeBtn?.addEventListener('click', () => box?.classList.remove('open'));

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input?.value.trim();
    if (!val) return;
    input.value = '';
    handleUserInput(val);
  });

  // Make chat buttons trigger actions
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('chat-btn')) {
      const label = e.target.textContent;
      handleButtonAction(label);
    }
  });
});
