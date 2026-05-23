import { useState, useMemo } from 'react'
import Header from '../Header'
import Footer from '../Footer'
import CollectionCard from '../CollectionCard'
import { productData, categories } from '../../data/productData'
import './index.css'

const Collections = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filteredData = useMemo(() => {
    let list = [...productData]
    if (selectedCategory !== 'All') {
      list = list.filter(p => p.category === selectedCategory)
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      )
    }
    return list
  }, [searchTerm, selectedCategory])

  return (
    <div className="collections-page">
      <Header />

      <main className="page-wrapper">
        {/* Hero */}
        <section className="collections-hero">
          <div className="container">
            <div className="badge badge-accent">Curated For You</div>
            <h1 className="section-title" style={{ marginTop: 12 }}>Our Collections</h1>
            <p className="section-subtitle">
              Thoughtfully curated pieces that blend aesthetics with functionality.
            </p>
          </div>
        </section>

        {/* Filter Bar */}
        <div className="collections-filter-bar">
          <div className="container collections-filter-inner">
            <div className="search-wrapper">
              <svg className="search-icon-svg" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="shop-search"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="search-clear" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>

            <div className="category-filters">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`cat-filter-btn${selectedCategory === cat ? ' active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result Count */}
        <div className="container" style={{ paddingTop: 28, paddingBottom: 4 }}>
          <p className="text-secondary" style={{ fontSize: 14 }}>
            Showing <strong>{filteredData.length}</strong> products
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
          </p>
        </div>

        {/* Grid */}
        <div className="container">
          {filteredData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛋</div>
              <h3 className="empty-state-title">Nothing found</h3>
              <p className="empty-state-text">Try a different search term or category</p>
              <button
                className="btn btn-accent"
                onClick={() => { setSearchTerm(''); setSelectedCategory('All') }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="collections-grid">
              {filteredData.map(item => (
                <CollectionCard key={item.id} details={item} />
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 60 }} />
      </main>

      <Footer />
    </div>
  )
}

export default Collections
