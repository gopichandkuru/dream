import { useEffect, useRef } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import './index.css'

const stats = [
  { label: 'Years in Business', value: '10+' },
  { label: 'Products Curated', value: '2000+' },
  { label: 'Happy Customers', value: '20,000+' },
  { label: 'Design Awards', value: '15+' },
]

const team = [
  {
    name: 'Gopi Chand',
    role: 'Founder & Lead Designer',
    img: 'https://res.cloudinary.com/dm63iwmi1/image/upload/v1767805626/mee_love_wsgiaw.jpg',
  },
]

const values = [
  { icon: '🎨', title: 'Craftsmanship', desc: 'Every product is selected for its quality, durability, and design excellence.' },
  { icon: '🌿', title: 'Sustainability', desc: 'We source responsibly and favor eco-friendly materials and processes.' },
  { icon: '💡', title: 'Innovation', desc: 'We constantly evolve our collection to reflect modern living trends.' },
  { icon: '🤝', title: 'Customer First', desc: 'Your satisfaction is our mission. We go above and beyond, always.' },
]

const About = () => {
  const fadeRefs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.15 }
    )
    fadeRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const addRef = el => { if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el) }

  return (
    <div className="about-page">
      <Header />

      <main className="page-wrapper">
        {/* Hero */}
        <section className="about-hero">
          <div className="about-hero-bg">
            <img
              src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80"
              alt="About us"
              className="about-hero-img"
              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1920&q=80' }}
            />
            <div className="about-hero-overlay" />
          </div>
          <div className="container about-hero-content">
            <div className="badge badge-accent" style={{ marginBottom: 16 }}>Our Story</div>
            <h1 className="about-hero-title">Crafting Beautiful<br />Spaces Since 2014</h1>
            <p className="about-hero-sub">
              We believe every home tells a story. Our mission is to help you tell yours beautifully.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="about-stats-section">
          <div className="container about-stats-grid">
            {stats.map((s, i) => (
              <div key={i} className="about-stat-card fade-up" ref={addRef}>
                <h2 className="about-stat-value">{s.value}</h2>
                <p className="about-stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="about-story section">
          <div className="container about-story-grid">
            <div className="about-story-text fade-up" ref={addRef}>
              <div className="badge badge-accent">Who We Are</div>
              <h2 className="section-title" style={{ marginTop: 12 }}>Our Mission</h2>
              <p className="section-subtitle">
                Dream D&apos;Accor was born from a simple belief — that everyone deserves a home they love.
              </p>
              <p style={{ marginTop: 16, fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                We are committed to delivering the finest furniture and decor products, 
                curated by interior design experts. From modern minimalism to classic elegance, 
                our collection caters to every taste and budget.
              </p>
              <p style={{ marginTop: 12, fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                Every piece in our catalogue is personally reviewed for quality, sustainability, 
                and aesthetic value. We don&apos;t just sell furniture — we help you create experiences.
              </p>
            </div>
            <div className="about-story-img-wrap fade-up" ref={addRef} style={{ transitionDelay: '0.1s' }}>
              <img
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80"
                alt="Beautiful room"
                className="about-story-img"
                onError={e => { e.target.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' }}
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="about-values section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header fade-up" ref={addRef}>
              <div className="badge badge-accent">Our Values</div>
              <h2 className="section-title" style={{ marginTop: 12 }}>What Drives Us</h2>
            </div>
            <div className="values-grid">
              {values.map((v, i) => (
                <div key={i} className="value-card card fade-up" ref={addRef} style={{ transitionDelay: `${i * 0.1}s` }}>
                  <span className="value-icon">{v.icon}</span>
                  <h3 className="value-title">{v.title}</h3>
                  <p className="value-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="about-team section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-header fade-up" ref={addRef}>
              <div className="badge badge-accent">Behind the Brand</div>
              <h2 className="section-title" style={{ marginTop: 12 }}>Meet the Founder</h2>
            </div>
            <div className="team-grid">
              {team.map((m, i) => (
                <div key={i} className="team-card card fade-up" ref={addRef}>
                  <img
                    src={m.img}
                    alt={m.name}
                    className="team-img"
                    onError={e => { e.target.src = 'https://ui-avatars.com/api/?name=GC&background=c8a97e&color=fff&size=200' }}
                  />
                  <div className="team-info">
                    <h3 className="team-name">{m.name}</h3>
                    <p className="team-role text-muted">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default About
