import { useState } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import toast from 'react-hot-toast'
import './index.css'

const ContactDetails = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill all required fields')
      return
    }
    setSending(true)
    await new Promise(r => setTimeout(r, 1500))
    toast.success('Message sent! We will get back to you soon.', { duration: 4000 })
    setForm({ name: '', email: '', subject: '', message: '' })
    setSending(false)
  }

  return (
    <div className="contact-page">
      <Header />

      <main className="page-wrapper">
        {/* Hero */}
        <section className="contact-hero">
          <div className="container">
            <div className="badge badge-accent">Get In Touch</div>
            <h1 className="section-title" style={{ marginTop: 12 }}>Contact Us</h1>
            <p className="section-subtitle">
              Have a question, need help, or just want to say hello? We&apos;re here for you.
            </p>
          </div>
        </section>

        <div className="container">
          <div className="contact-layout">
            {/* Info Cards */}
            <div className="contact-info">
              <div className="profile-card card">
                <img
                  src="https://res.cloudinary.com/dm63iwmi1/image/upload/v1767805626/mee_love_wsgiaw.jpg"
                  alt="Gopi Chand"
                  className="profile-avatar"
                  onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=GC&background=c8a97e&color=fff&size=200' }}
                />
                <h2 className="profile-name">Mr. Gopi Chand</h2>
                <p className="profile-role text-muted">Founder & Lead Designer</p>
                <p className="profile-location text-muted">📍 Andhra Pradesh, India</p>
              </div>

              <div className="contact-cards">
                {[
                  { icon: '📧', label: 'Email', value: 'gopichand55k@gmail.com', link: 'mailto:gopichand55k@gmail.com' },
                  { icon: '📞', label: 'Phone', value: '+91 9704491654', link: 'tel:+919704491654' },
                  { icon: '💼', label: 'LinkedIn', value: 'gopi-chand-kuruva', link: 'https://www.linkedin.com/in/gopi-chand-kuruva/' },
                  { icon: '📸', label: 'Instagram', value: '@not.mr_official', link: 'https://www.instagram.com/not.mr_official/' },
                ].map((c, i) => (
                  <a key={i} href={c.link} target="_blank" rel="noreferrer" className="contact-info-card card">
                    <span className="contact-card-icon">{c.icon}</span>
                    <div>
                      <p className="contact-card-label text-muted">{c.label}</p>
                      <p className="contact-card-value">{c.value}</p>
                    </div>
                    <svg className="contact-card-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-section">
              <div className="card contact-form-card">
                <h2 className="contact-form-title">Send a Message</h2>
                <p className="text-secondary" style={{ fontSize: 14, marginBottom: 24 }}>
                  Fill out the form and I&apos;ll respond within 24 hours.
                </p>

                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input
                        className="form-input"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        className="form-input"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input
                      className="form-input"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="How can we help?"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-input contact-textarea"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-accent btn-lg"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={sending}
                  >
                    {sending ? (
                      <><span className="spinner" /> Sending...</>
                    ) : (
                      <>Send Message →</>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 60 }} />
      </main>

      <Footer />
    </div>
  )
}

export default ContactDetails
