// EditorialBoard.js (or .tsx)

import React, { useEffect, useMemo, useState } from 'react';
import { mockAPI } from '../data/mockData';

const FALLBACK_BOARD = [
  {
    id: 'eic_1',
    section: 'Editor-in-Chief',
    name: 'Dr. Navnath D. Kale',
    title: 'Senior Assistant Professor, Dept. of Computer Engineering',
    affiliation: 'MIT Academy of Engineering, Pune, India.',
    email: 'info@buildsofttech.in, navnath.kale@mitaoe.ac.in',
    profileUrl: 'https://mitaoe.ac.in/school-of-computer-engineering-n-d-kale.php',
    sortOrder: 0,
  },
  {
    id: 'ae_1',
    section: 'Associate Editors',
    name: 'Dr. Yogesh Gurav',
    title: 'Dean Academics & Research',
    affiliation: 'Dr. D. Y. Patil Technical Campus, Talegaon, Pune, India',
    email: 'yogesh.gurav@dypatiltcs.com',
    profileUrl: 'https://www.dypatiltcs.com/from-academics-dean/',
    sortOrder: 0,
  },
  {
    id: 'ae_2',
    section: 'Associate Editors',
    name: 'Dr. M. Venkateshwara Rao',
    title: 'Professor, Dept. of Computer Science and Engineering',
    affiliation: 'Vignana Bharathi Institute of Technology, Ghatkesar, Hyderabad, India.',
    email: 'venkateshwara.rao@vbithyd.ac.in',
    profileUrl: 'https://vbithyd.ac.in/employees/dr-m-venkateswara-rao/',
    sortOrder: 1,
  },
  {
    id: 'ae_3',
    section: 'Associate Editors',
    name: 'Dr. Pramod Ganjewar',
    title: 'Head, Dept of Computer Engineering',
    affiliation: 'MIT Academy of Engineering, Pune, India.',
    email: 'pdganjewar@mitaoe.ac.in',
    profileUrl: 'https://mitaoe.ac.in/school-of-computer-engineering-and-technology-ganjewar.php',
    sortOrder: 2,
  },
  {
    id: 'ae_4',
    section: 'Associate Editors',
    name: 'Dr. Manish Giri',
    title: 'Head, Dept. of Computer Engineering (Software Engineering)',
    affiliation: 'MIT Academy of Engineering, Pune, India.',
    email: 'mbgiri@mitaoe.ac.in',
    profileUrl: 'https://mitaoe.ac.in/school-of-computer-engineering-and-technology-manish-giri.php',
    sortOrder: 3,
  },
  {
    id: 'ae_5',
    section: 'Associate Editors',
    name: 'Dr. G. Arun',
    title: 'Associate Professor, Dept. of Computer Science and Engineering',
    affiliation: 'Vignana Bharathi Institute of Technology, Ghatkesar, Hyderabad, India.',
    email: 'g.arun@vbithyd.ac.in',
    profileUrl: 'https://vbithyd.ac.in/employees/dr-g-arun/',
    sortOrder: 4,
  },
  {
    id: 'ae_6',
    section: 'Associate Editors',
    name: 'Dr. Mukesh Kumar Tripathi',
    title: '',
    affiliation: 'KIET group of institutions, Delhi- NCR, Ghaziabad, India',
    email: 'mukesh.kumar@kiet.edu',
    profileUrl: 'https://www.kiet.edu/programs/undergraduate-programs/cse-aiml/faculty/',
    sortOrder: 5,
  },
  {
    id: 'ae_7',
    section: 'Associate Editors',
    name: 'Prof. Ayub A. Tamboli',
    title: 'Principal',
    affiliation: 'Zeal Polytechnic, Pune, India',
    email: 'polytechnic@zealeducation.com',
    profileUrl: 'https://zealpolytechnic.com/principals-message/',
    sortOrder: 6,
  },
  {
    id: 'ae_8',
    section: 'Associate Editors',
    name: 'Dr. S. N. Patil',
    title: 'Principal',
    affiliation: 'Yashoda Mahadeo Kakade College of Engineering, Talegaon, Pune',
    email: 'principal@ymkcoe.com',
    profileUrl: 'https://ymkcoe.com/PRINCIPAL.php',
    sortOrder: 7,
  },
  {
    id: 'ae_9',
    section: 'Associate Editors',
    name: 'Dr. Vijaykumar P. Mantri',
    title: 'Senior Assistant Professor',
    affiliation: 'MIT Academy of Engineering, Pune, India',
    email: 'vijay.mantri@mitaoe.ac.in',
    profileUrl: 'https://mitaoe.ac.in/school-of-computer-engineering-vijaykumar-mantri.php',
    sortOrder: 8,
  },
  {
    id: 'ae_10',
    section: 'Associate Editors',
    name: 'Dr. Anand Soni',
    title: 'Faculty- School of Business',
    affiliation: 'Bahrain Polytechnic, Kingdom of Bahrain',
    email: 'anand.soni@polytechnic.bh',
    profileUrl: '',
    sortOrder: 9,
  },
];

const EditorialBoard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [board, setBoard] = useState([]);

  useEffect(() => {
    const loadBoard = async () => {
      try {
        setLoading(true);
        setError('');
        const result = await mockAPI.getEditorialBoard();
        if (result.success && Array.isArray(result.board)) {
          setBoard(result.board);
        } else {
          setBoard(FALLBACK_BOARD);
          setError('');
        }
      } catch (e) {
        console.error('Failed to load editorial board', e);
        setBoard(FALLBACK_BOARD);
        setError('');
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, []);

  const sections = useMemo(() => {
    const groups = {};
    (board || []).forEach((m) => {
      const key = String(m?.section || '').trim() || 'Editorial Board';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    Object.keys(groups).forEach((k) => {
      groups[k] = (groups[k] || []).slice().sort((a, b) => {
        const aOrder = typeof a?.sortOrder === 'number' ? a.sortOrder : parseInt(String(a?.sortOrder ?? ''), 10);
        const bOrder = typeof b?.sortOrder === 'number' ? b.sortOrder : parseInt(String(b?.sortOrder ?? ''), 10);
        const aVal = Number.isNaN(aOrder) ? 0 : aOrder;
        const bVal = Number.isNaN(bOrder) ? 0 : bOrder;
        return aVal - bVal;
      });
    });
    return groups;
  }, [board]);

  const initialsOf = (name) => String(name || '')
    .replace(/^Dr\.\s*/i, '')
    .replace(/^Prof\.\s*/i, '')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

  const renderCard = (m) => (
    <article className="board-card" key={m.id || `${m.section}-${m.name}-${m.email}`}>
      {m.photo
        ? <img className="member-avatar member-photo" src={m.photo} alt={m.name} />
        : <div className="member-avatar">{initialsOf(m.name)}</div>}
      <strong>{m.name}</strong>
      {m.title && <span>{m.title}</span>}
      {m.affiliation && <small>{m.affiliation}</small>}
      {m.email && <a href={`mailto:${m.email}`}>{m.email}</a>}
      {m.profileUrl && <a href={m.profileUrl} target="_blank" rel="noreferrer">Profile ↗</a>}
    </article>
  );

  // Editor-in-Chief sits in a narrow column, a divider, then the Associate Editors grid,
  // so the single chief card does not leave a row of empty space.
  const entries = Object.entries(sections);
  const chiefKey = entries.find(([k]) => /chief/i.test(k))?.[0];
  const associateKey = entries.find(([k]) => /associate/i.test(k))?.[0];
  const rest = entries.filter(([k]) => k !== chiefKey && k !== associateKey);

  return (
    <div className="editorial-board-page">
      <section className="page-banner">
        <div className="journal-container banner-split">
          <div>
            <p className="breadcrumb">Home / Editorial Board</p>
            <p className="eyebrow">SCHOLARLY LEADERSHIP</p>
            <h1>Editorial Board</h1>
          </div>
          <aside className="banner-cta">
            <div className="banner-cta-icon" aria-hidden="true">✎</div>
            <div>
              <h2>Interested in Joining the Editorial Board?</h2>
              <p>IJEPA welcomes qualified academics and industry professionals as Associate Editors or Reviewers. If you have a strong research background, we invite you to apply.</p>
              <a href="/joinusedito" className="button button-white button-small">Apply Now</a>
            </div>
          </aside>
        </div>
      </section>

      <div className="page-body journal-container">
        {loading ? (
          <div className="loading-state" role="status">Loading editorial board…</div>
        ) : entries.length === 0 ? (
          <div className="empty-state">{error || 'No editorial board members found.'}</div>
        ) : (
          <>
            {(chiefKey || associateKey) && (
              <section className={`board-layout${chiefKey && associateKey ? '' : ' is-single'}`}>
                {chiefKey && (
                  <div className="board-chief">
                    <div className="section-heading"><h2>{chiefKey}</h2></div>
                    <div className="board-grid is-chief">{sections[chiefKey].map(renderCard)}</div>
                  </div>
                )}
                {chiefKey && associateKey && <div className="board-divider" aria-hidden="true" />}
                {associateKey && (
                  <div className="board-associates">
                    <div className="section-heading"><h2>{associateKey}</h2></div>
                    <div className="board-grid is-associates">{sections[associateKey].map(renderCard)}</div>
                  </div>
                )}
              </section>
            )}
            {rest.map(([sectionName, members]) => (
              <section key={sectionName} className="content-section board-section">
                <div className="section-heading"><h2>{sectionName}</h2></div>
                <div className="board-grid">{members.map(renderCard)}</div>
              </section>
            ))}
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 32 }}>
          For inquiries regarding the Editorial Board, please contact the Editorial Office at{' '}
          <a href="mailto:info@buildsofttech.in">info@buildsofttech.in</a>.
        </p>
      </div>
    </div>
  );
};

export default EditorialBoard;
