import { useState, useMemo, useEffect } from 'react'
import { membersByGroup, defaultSections } from './membersData'
import FireflyCanvas from './FireflyCanvas'
import MusicPlayer from './MusicPlayer'
import AdminLogin from './admin/AdminLogin'
import AdminDashboard from './admin/AdminDashboard'
import {
  getAllMembers,
  fetchAllMembers,
  subscribeToRosterChanges,
  updateMemberAvatar,
  ROSTER_KEYS,
  FIXED_HEAD_NAMES,
} from './services/memberService'
import './App.css'

const GROUP_STORAGE_KEYS = {
  'MAIN TRIPLES': 'members',
  'TRIPLES PERFECT': 'triples_perfect',
  'TRIPLES LADY': 'triples_lady',
  'TAMSTEP': 'tamstep',
  'PERFECT': 'perfect',
  'HEREWEGOAGAIN': 'herewegoagain',
  'BABYYOUOK': 'babyyouok',
  'ROCKS': 'rocks',
}

export default function App() {
  const [currentView, setCurrentView] = useState('home') // 'home' | 'members'
  const [currentGroupTitle, setCurrentGroupTitle] = useState('MAIN TRIPLES')
  const [searchQuery, setSearchQuery] = useState('')

  // Check for admin route (/adminlogin or #adminlogin or ?adminlogin)
  const checkIsAdminRoute = () => {
    const path = window.location.pathname.toLowerCase()
    const hash = window.location.hash.toLowerCase()
    const search = window.location.search.toLowerCase()
    return path.includes('adminlogin') || hash.includes('adminlogin') || search.includes('adminlogin')
  }

  const [isAdminRoute, setIsAdminRoute] = useState(checkIsAdminRoute)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('triples_admin_auth') === 'true'
  })

  useEffect(() => {
    const handleUrlChange = () => {
      setIsAdminRoute(checkIsAdminRoute())
    }
    window.addEventListener('popstate', handleUrlChange)
    window.addEventListener('hashchange', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
      window.removeEventListener('hashchange', handleUrlChange)
    }
  }, [])

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true)
  }

  const handleAdminLogout = () => {
    sessionStorage.removeItem('triples_admin_auth')
    setIsAdminLoggedIn(false)
  }

  const handleExitAdmin = () => {
    // Navigate back to root view
    if (window.location.hash.includes('adminlogin')) {
      window.location.hash = ''
    } else if (window.location.search.includes('adminlogin')) {
      window.history.pushState({}, '', '/')
    } else {
      window.history.pushState({}, '', '/')
    }
    setIsAdminRoute(false)
    setCurrentView('home')
  }

  // 🖼️ ใช้รูปภาพพื้นหลังจาก asset/Triples.png ในทุกหน้าตามที่กำหนด
  const bgImage = '/asset/Triples.png'

  const bottomButtons = [
    { name: 'TAMSTEP' },
    { name: 'PERFECT' },
    { name: 'HEREWEGOAGAIN', isCenter: true },
    { name: 'BABYYOUOK' },
    { name: 'ROCKS' },
  ]

  const handleOpenMembers = (title) => {
    setCurrentGroupTitle(title || 'MAIN TRIPLES')
    setSearchQuery('')
    setCurrentView('members')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const [rosterSync, setRosterSync] = useState(0)

  useEffect(() => {
    fetchAllMembers().catch(() => {})
    const unsubscribe = subscribeToRosterChanges(() => {
      setRosterSync((v) => v + 1)
    })
    const handleSync = () => setRosterSync((v) => v + 1)
    window.addEventListener('triples_roster_updated', handleSync)
    return () => {
      unsubscribe()
      window.removeEventListener('triples_roster_updated', handleSync)
    }
  }, [])

  // Helper format social link
  const formatSocialUrl = (url, type) => {
    if (!url) return '#'
    const val = String(url).trim()
    if (!val || val === '#') return '#'
    if (val.startsWith('http://') || val.startsWith('https://')) return val

    switch (type) {
      case 'facebook':
        return `https://facebook.com/${val.replace(/^@/, '')}`
      case 'instagram':
        return `https://instagram.com/${val.replace(/^@/, '')}`
      case 'tiktok':
        return `https://tiktok.com/@${val.replace(/^@/, '')}`
      case 'kick':
        return `https://kick.com/${val.replace(/^@/, '')}`
      case 'youtube':
        return val.includes('youtube.com') || val.includes('youtu.be')
          ? `https://${val}`
          : `https://youtube.com/${val.startsWith('@') ? val : '@' + val}`
      default:
        return `https://${val}`
    }
  }

  // State สำหรับ Modal จัดการรูปโปรไฟล์ของสมาชิก
  const [profileModalMember, setProfileModalMember] = useState(null)
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editEmailVerify, setEditEmailVerify] = useState('')
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const handleOpenProfileModal = (member) => {
    setProfileModalMember(member)
    setEditImageUrl(member.avatar || member.imageUrl || '')
    setEditEmailVerify('')
    setEditError('')
    setEditSuccess('')
  }

  const handleSaveProfileAvatar = async (e) => {
    e?.preventDefault()
    if (!profileModalMember) return
    if (!editImageUrl.trim()) {
      setEditError('กรุณากรอกลิงก์รูปภาพ (Direct Image URL)')
      return
    }

    // ถ้ามี profileEmail กำหนดไว้ และไม่ได้เป็นแอดมินล็อกอิน ให้ตรวจเช็คอีเมล
    if (profileModalMember.profileEmail && !isAdminLoggedIn) {
      if (editEmailVerify.trim().toLowerCase() !== profileModalMember.profileEmail.trim().toLowerCase()) {
        setEditError('อีเมลไม่ถูกต้อง กรุณากรอกอีเมลของโปรไฟล์นี้เพื่อยืนยันสิทธิ์')
        return
      }
    }

    try {
      const rosterKey = profileModalMember.groupKey || GROUP_STORAGE_KEYS[currentGroupTitle] || 'members'
      await updateMemberAvatar(
        profileModalMember.id || profileModalMember.name,
        editImageUrl.trim(),
        rosterKey
      )
      setEditSuccess('บันทึกรูปโปรไฟล์เรียบร้อยแล้ว!')
      setTimeout(() => {
        setProfileModalMember(null)
      }, 800)
    } catch (err) {
      console.error(err)
      setEditError('เกิดข้อผิดพลาดในการบันทึกข้อมูล')
    }
  }

  // ดึงข้อมูลกลุ่มที่เลือก (เชื่อมโยงกับฐานข้อมูล JSON members.json โดยตรง ไม่ใช้ LocalStorage)
  const activeSections = useMemo(() => {
    const isAll = currentGroupTitle.toUpperCase() === 'ALL'
    const fullDb = getAllMembers()

    const processMember = (m, groupName = '', groupKey = '') => {
      const nameLower = (m.name || m.username || '').toLowerCase().trim()
      const isFixedHead = FIXED_HEAD_NAMES.includes(nameLower)
      const ro = String(m.rankOrder || '')
      const roleLower = (m.role || '').toLowerCase()
      // ถ้าเป็น 6 ผู้ก่อตั้ง หรือ role เป็น Head หรือ ro เป็น 1 ให้นับเป็น HEAD ทั้งหมด
      const isHead = isFixedHead || roleLower.includes('head') || roleLower.includes('founder') || roleLower.includes('boss') || ro === '1'
      const isLeader = !isHead && (roleLower.includes('leader') || ro === '2')
      const isRespect = !isHead && !isLeader && (roleLower.includes('respect') || ro === '3')
      const isLastname = !isHead && !isLeader && !isRespect && (roleLower.includes('lastname') || ro === '4')
      const isMember = !isHead && !isLeader && !isRespect && !isLastname

      let fb = m.facebook || ''
      let ig = m.instagram || ''
      let tt = m.tiktok || ''
      let kick = m.kick || ''
      let yt = m.youtube || ''

      if (!fb && !ig && !tt && !kick && !yt && m.socialLink) {
        const sl = m.socialLink.toLowerCase()
        if (sl.includes('instagram')) ig = m.socialLink
        else if (sl.includes('tiktok')) tt = m.socialLink
        else if (sl.includes('kick')) kick = m.socialLink
        else if (sl.includes('youtube') || sl.includes('youtu.be')) yt = m.socialLink
        else fb = m.socialLink
      }

      const defaultRoleName = isHead ? 'HEAD' : isLeader ? 'LEADER' : isRespect ? 'RESPECT' : isLastname ? 'LASTNAME' : 'MEMBER'
      let finalRole = defaultRoleName
      if (m.role && m.role.trim()) {
        const tr = m.role.trim()
        if (isHead) finalRole = tr.toUpperCase()
        else if (!tr.toLowerCase().includes('head')) finalRole = tr.toUpperCase()
      }

      return {
        id: m.id,
        name: m.name || m.username,
        rank: finalRole,
        avatar: m.avatar || m.imageUrl || '/asset/Triples-Logo.png',
        facebook: fb,
        instagram: ig,
        tiktok: tt,
        kick: kick,
        youtube: yt,
        profileEmail: m.profileEmail || '',
        cardClass: isHead ? 'rank-boss' : isLeader ? 'rank-leader' : isRespect ? 'rank-respect' : isLastname ? 'rank-lastname' : 'rank-member',
        isHead,
        isLeader,
        isRespect,
        isLastname,
        isMember,
        groupName,
        groupKey,
      }
    }

    if (isAll) {
      const headList = []
      const leaderList = []
      const respectList = []
      const lastnameList = []
      const memberList = []

      Object.entries(GROUP_STORAGE_KEYS).forEach(([grpName, rosterId]) => {
        const stored = fullDb[rosterId]
        if (Array.isArray(stored) && stored.length > 0) {
          stored.forEach((m) => {
            const item = processMember(m, grpName, rosterId)
            if (item.isHead) headList.push(item)
            else if (item.isLeader) leaderList.push(item)
            else if (item.isRespect) respectList.push(item)
            else if (item.isLastname) lastnameList.push(item)
            else memberList.push(item)
          })
        }
      })

      return [
        { rankId: 'head', title: 'HEAD', cardClass: 'rank-boss', badgeTitle: 'Head', members: headList },
        { rankId: 'leader', title: 'LEADERS', cardClass: 'rank-leader', badgeTitle: 'Leader', members: leaderList },
        { rankId: 'respect', title: 'RESPECT', cardClass: 'rank-respect', badgeTitle: 'Respect', members: respectList },
        { rankId: 'lastname', title: 'LASTNAME', cardClass: 'rank-lastname', badgeTitle: 'Lastname', members: lastnameList },
        { rankId: 'member', title: 'MEMBER', cardClass: 'rank-member', badgeTitle: 'Member', members: memberList },
      ]
    }

    const rosterId = GROUP_STORAGE_KEYS[currentGroupTitle] || 'members'
    let stored = fullDb[rosterId]
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      try {
        if (typeof window !== 'undefined') {
          const directStored = localStorage.getItem('triples_members_' + rosterId)
          if (directStored) {
            const parsed = JSON.parse(directStored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              stored = parsed
            }
          }
        }
      } catch (e) {}
    }
    if (Array.isArray(stored) && stored.length > 0) {
      const headList = []
      const leaderList = []
      const respectList = []
      const lastnameList = []
      const memberList = []

      stored.forEach((m) => {
        const item = processMember(m, currentGroupTitle, rosterId)
        if (item.isHead) headList.push(item)
        else if (item.isLeader) leaderList.push(item)
        else if (item.isRespect) respectList.push(item)
        else if (item.isLastname) lastnameList.push(item)
        else memberList.push(item)
      })

      return [
        {
          rankId: 'head',
          title: 'HEAD',
          cardClass: 'rank-boss',
          badgeTitle: 'Head',
          members: headList,
        },
        {
          rankId: 'leader',
          title: 'LEADERS',
          cardClass: 'rank-leader',
          badgeTitle: 'Leader',
          members: leaderList,
        },
        {
          rankId: 'respect',
          title: 'RESPECT',
          cardClass: 'rank-respect',
          badgeTitle: 'Respect',
          members: respectList,
        },
        {
          rankId: 'lastname',
          title: 'LASTNAME',
          cardClass: 'rank-lastname',
          badgeTitle: 'Lastname',
          members: lastnameList,
        },
        {
          rankId: 'member',
          title: 'MEMBER',
          cardClass: 'rank-member',
          badgeTitle: 'Member',
          members: memberList,
        },
      ]
    }

    const fallback = membersByGroup[currentGroupTitle] || defaultSections
    return fallback.map((sec) => ({
      ...sec,
      members: (sec.members || []).map((m) => ({
        ...m,
        avatar: m.avatar || m.imageUrl || '/asset/Triples-Logo.png',
      })),
    }))
  }, [currentGroupTitle, rosterSync])

  // Filter members based on search
  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return activeSections
      .map((section) => {
        const filtered = (section.members || []).filter(
          (m) =>
            m.name?.toLowerCase().includes(q) ||
            m.rank?.toLowerCase().includes(q)
        )
        return {
          ...section,
          count: filtered.length,
          members: filtered,
        }
      })
      .filter((section) => !q || section.members.length > 0)
  }, [activeSections, searchQuery])

  const totalMembersCount = useMemo(() => {
    return filteredSections.reduce((acc, sec) => acc + (sec.members?.length || 0), 0)
  }, [filteredSections])

  // ==========================================
  // ROUTE 1: ADMIN BACKEND (/adminlogin)
  // ==========================================
  if (isAdminRoute) {
    if (!isAdminLoggedIn) {
      return (
        <>
          <FireflyCanvas />
          <AdminLogin
            onLoginSuccess={handleAdminLoginSuccess}
            onBackToHome={handleExitAdmin}
          />
        </>
      )
    }

    return (
      <AdminDashboard
        onLogout={handleAdminLogout}
        onGoToLiveSite={handleExitAdmin}
      />
    )
  }

  return (
    <>
      {/* Persistent Animated Firefly Background */}
      <FireflyCanvas />

      {/* ==========================================
          VIEW 1: HOME PAGE
          ========================================== */}
      {currentView === 'home' ? (
        <div
          className="page-container"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2)), url("${bgImage}")`,
          }}
        >
          {/* ส่วนหัวด้านบน: Triples For real + 6 YEARS WE FEARED NOTHING */}
          <div className="top-title-wrapper">
            <h1 className="hero-title top-title">Triples For real</h1>
            <p className="hero-subtitle">6 YEARS WE FEARED NOTHING</p>
          </div>

          {/* Main Content (Centered Buttons) */}
          <main className="main-content">
            {/* แถวบนสุด: MAIN TRIPLES */}
            <button
              className="action-button member-button"
              onClick={() => handleOpenMembers('MAIN TRIPLES')}
            >
              MAIN TRIPLES
            </button>

            {/* แถวตรงนี้: Triples Perfect, Triples Lady */}
            <div className="mid-buttons">
              <button
                className="action-button member-button"
                onClick={() => handleOpenMembers('TRIPLES PERFECT')}
              >
                TRIPLES PERFECT
              </button>
              <button
                className="action-button member-button"
                onClick={() => handleOpenMembers('TRIPLES LADY')}
              >
                TRIPLES LADY
              </button>
            </div>

            {/* หัวข้อ GROUP BY TRIPLES */}
            <div className="partner-title">GROUP BY TRIPLES</div>

            {/* แถวล่าง: Tamstep, Perfect, Babyyouok, Rocks, Herewegoagain */}
            <div className="bottom-buttons">
              {bottomButtons.map((btn) => (
                <button
                  key={btn.name}
                  className={`action-button partner-btn ${btn.isCenter ? 'center-btn' : ''}`}
                  onClick={() => handleOpenMembers(btn.name)}
                >
                  {btn.name}
                </button>
              ))}
            </div>
          </main>

          {/* Footer ด้านล่างสุดตรงกลาง */}
          <footer className="site-footer">
            <span className="footer-group">
              <span className="footer-prefix">DESIGN BY</span>
              <span className="footer-author">DEVV KODOMO</span>
            </span>
            <span className="footer-group">
              <span className="footer-prefix">POWERED BY</span>
              <span className="footer-author">MEWIE CONQUERS</span>
            </span>
          </footer>
        </div>
      ) : (
        /* ==========================================
           VIEW 2: MEMBER LIST PAGE (หน้ารายชื่อ)
           ========================================== */
        <div
          className="members-page-wrapper"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35)), url("${bgImage}")`,
          }}
        >
          {/* Top Bar Navigation: ปุ่ม HOME รูปบ้าน */}
          <div className="members-nav-bar">
            <button className="back-btn home-btn" onClick={handleBackToHome} title="Home">
              <svg className="home-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span>HOME</span>
            </button>
          </div>

          <div className="members-content-container">
            {/* Header */}
            <div className="members-header-section">
              <h1 className="members-main-title">{currentGroupTitle}</h1>
              <p className="members-sub-title">6 YEARS WE FEARED NOTHING</p>
            </div>

            {/* Live Search Bar */}
            <div className="search-bar-wrapper">
              <input
                type="text"
                className="members-search-input"
                placeholder="SEARCH MEMBERS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Rank Sections */}
            <div className="members-sections-wrapper">
              {totalMembersCount === 0 ? (
                <div className="empty-members-container">
                  <div className="empty-badge">NO MEMBERS</div>
                  <p className="empty-members-title">ยังไม่มีรายชื่อสมาชิกในกลุ่มนี้</p>
                  <p className="empty-members-subtitle">
                    {searchQuery
                      ? `NO MEMBERS FOUND MATCHING "${searchQuery}"`
                      : 'NO MEMBERS HAVE BEEN ADDED YET'}
                  </p>
                </div>
              ) : (
                filteredSections.map((section) => {
                  if (!section.members || section.members.length === 0) return null
                  return (
                    <div key={section.rankId} className="rank-section-group">
                      {/* Section Title with count badge and line */}
                      <div className="section-title-row">
                        <h2 className="section-title-text">{section.title}</h2>
                        <span className="section-count-badge">[ {section.count} ]</span>
                        <div className="section-divider-line" />
                      </div>

                      {/* Member Cards Grid */}
                      <div className="members-grid">
                        {section.members.map((member, idx) => {
                          const isHeadMember =
                            member.isHead ||
                            section.rankId === 'head' ||
                            member.cardClass === 'rank-boss' ||
                            (member.rank || '').toUpperCase() === 'HEAD' ||
                            (member.rank || '').toLowerCase().includes('head')

                          const isLeaderMember =
                            !isHeadMember &&
                            (member.isLeader ||
                              section.rankId === 'leader' ||
                              member.cardClass === 'rank-leader' ||
                              (member.rank || '').toUpperCase() === 'LEADER' ||
                              (member.rank || '').toLowerCase().includes('leader'))

                          return (
                            <div
                              key={member.id || idx}
                              className={`member-card ${member.cardClass || section.cardClass || 'rank-' + section.rankId}`}
                            >
                              {/* Left: Avatar with status dot */}
                              <div className="member-avatar-wrapper">
                                <img
                                  src={member.avatar || '/asset/Triples-Logo.png'}
                                  alt={member.name}
                                  className="member-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null
                                    e.currentTarget.src = '/asset/Triples-Logo.png'
                                  }}
                                />
                                <span className="member-status-dot" title="Online" />
                              </div>

                              {/* Middle: Info */}
                              <div className="member-info-stack">
                                <h3 className="member-name-heading" title={member.name}>
                                  <span className="member-name-text">{member.name}</span>
                                  {isHeadMember && (
                                    <img
                                      src="/king.png"
                                      alt="Head Crown"
                                      className="member-head-badge-icon"
                                    />
                                  )}
                                  {isLeaderMember && (
                                    <img
                                      src="/medal.png"
                                      alt="Leader Medal"
                                      className="member-leader-badge-icon"
                                    />
                                  )}
                                </h3>
                                <div className="member-rank-subtitle">
                                  {member.rank || section.badgeTitle || section.title || 'MEMBER'}
                                </div>
                              </div>

                            {/* Right: Actions / Social Buttons */}
                            <div className="member-actions-row">
                              {/* Facebook */}
                              {member.facebook && member.facebook !== '#' && (
                                <a
                                  href={formatSocialUrl(member.facebook, 'facebook')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="member-action-pill pill-facebook"
                                  title="Facebook"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.52-.14-2.71-.14-2.72 0-4.79 1.66-4.79 4.9v2.6H7v4h3V22h4v-8.5z" />
                                  </svg>
                                </a>
                              )}

                              {/* Instagram */}
                              {member.instagram && (
                                <a
                                  href={formatSocialUrl(member.instagram, 'instagram')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="member-action-pill pill-instagram"
                                  title="Instagram"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                  </svg>
                                </a>
                              )}

                              {/* TikTok */}
                              {member.tiktok && (
                                <a
                                  href={formatSocialUrl(member.tiktok, 'tiktok')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="member-action-pill pill-tiktok"
                                  title="TikTok"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.32 0 .62.06.9.15V9.41a6.3 6.3 0 0 0-.9-.07A6.33 6.33 0 0 0 3 15.67 6.33 6.33 0 0 0 9.33 22a6.33 6.33 0 0 0 6.34-6.33V8.84a8.18 8.18 0 0 0 4.79 1.52V6.9a4.85 4.85 0 0 1-.87-.21z" />
                                  </svg>
                                </a>
                              )}

                              {/* Kick */}
                              {member.kick && (
                                <a
                                  href={formatSocialUrl(member.kick, 'kick')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="member-action-pill pill-kick"
                                  title="Kick"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 2h5.5v7.2L13.8 2h6l-6.8 8.3 7.3 11.7h-6.2l-4.6-8.2V22H3V2z" />
                                  </svg>
                                </a>
                              )}

                              {/* YouTube */}
                              {member.youtube && (
                                <a
                                  href={formatSocialUrl(member.youtube, 'youtube')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="member-action-pill pill-youtube"
                                  title="YouTube"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                  </svg>
                                </a>
                              )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer ด้านล่างสุดตรงกลาง */}
            <footer className="site-footer">
            <span className="footer-group">
              <span className="footer-prefix">DESIGN BY</span>
              <span className="footer-author">DEVV KODOMO</span>
            </span>
            <span className="footer-group">
              <span className="footer-prefix">POWERED BY</span>
              <span className="footer-author">MEWIE CONQUERS</span>
            </span>
          </footer>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: จัดการโปรไฟล์สมาชิก (แก้รูปเอง)
          ========================================== */}
      {profileModalMember && (
        <div className="profile-modal-overlay" onClick={() => setProfileModalMember(null)}>
          <div className="profile-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                <span>จัดการโปรไฟล์สมาชิก</span>
              </div>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setProfileModalMember(null)}
                title="ปิด"
              >
                ✕
              </button>
            </div>

            <div className="profile-modal-preview">
              <div className="member-avatar-wrapper" style={{ width: 56, height: 56 }}>
                <img
                  src={editImageUrl || profileModalMember.avatar || '/asset/Triples-Logo.png'}
                  alt={profileModalMember.name}
                  className="member-avatar-img"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = '/asset/Triples-Logo.png'
                  }}
                />
                <span className="member-status-dot" />
              </div>
              <div className="profile-modal-meta">
                <div className="profile-modal-member-name">{profileModalMember.name}</div>
                <div className="profile-modal-member-rank">{profileModalMember.rank}</div>
              </div>
            </div>

            <form onSubmit={handleSaveProfileAvatar} className="profile-modal-form">
              <label className="profile-field-label">
                DIRECT IMAGE URL (ลิงก์รูปภาพโปรไฟล์ใหม่)
              </label>
              <input
                type="text"
                className="profile-field-input"
                placeholder="https://... (Direct Image URL)"
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />

              {profileModalMember.profileEmail && !isAdminLoggedIn && (
                <>
                  <label className="profile-field-label" style={{ marginTop: 12 }}>
                    ยืนยันอีเมลเจ้าของโปรไฟล์
                  </label>
                  <input
                    type="email"
                    className="profile-field-input"
                    placeholder="member@email.com"
                    value={editEmailVerify}
                    onChange={(e) => setEditEmailVerify(e.target.value)}
                  />
                  <span className="profile-field-hint">
                    * ต้องระบุอีเมลที่ตรงกับที่ลงทะเบียนไว้ในระบบจึงจะสามารถแก้ไขรูปโปรไฟล์ได้
                  </span>
                </>
              )}

              {editError && (
                <div className="profile-modal-msg error">{editError}</div>
              )}
              {editSuccess && (
                <div className="profile-modal-msg success">{editSuccess}</div>
              )}

              <div className="profile-modal-btns">
                <button
                  type="button"
                  className="profile-btn cancel"
                  onClick={() => setProfileModalMember(null)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="profile-btn save">
                  บันทึกรูปโปรไฟล์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          PERSISTENT MUSIC PLAYER (มุมล่างขวาทุกหน้า)
          ========================================== */}
      <MusicPlayer />
    </>
  )
}
