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
    email: 'editor@ijepa.org, navnath.kale@mitaoe.ac.in',
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-slate-800">
      <h1 className="text-3xl font-bold text-center mb-6 text-slate-900">
        Editorial Board
      </h1>
      <p className="text-lg text-center text-slate-700 mb-8 italic">
       
      </p>

      {loading ? (
        <div className="text-center text-slate-600 py-10">Loading editorial board...</div>
      ) : Object.keys(sections).length === 0 ? (
        <div className="text-center text-slate-600 py-10">{error || 'No editorial board members found.'}</div>
      ) : (
        Object.entries(sections).map(([sectionName, members]) => (
          <section key={sectionName} className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-slate-800 border-b pb-2">{sectionName}</h2>
            <div className="space-y-4">
              {members.map((m) => (
                <div key={m.id || `${m.section}-${m.name}-${m.email}`} className="bg-slate-50 p-4 rounded-lg">
                  <p className="font-medium">{m.name}</p>
                  {m.title && <p className="text-slate-700">{m.title}</p>}
                  {m.affiliation && <p className="text-slate-700">{m.affiliation}</p>}
                  {m.email && (
                    <p className="text-slate-600 text-sm">
                      Email:{' '}
                      <a href={`mailto:${m.email}`} className="text-amber-600 hover:underline">
                        {m.email}
                      </a>
                    </p>
                  )}
                  {m.profileUrl && (
                    <p className="text-slate-600 text-sm mt-1">
                      <a
                        href={m.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 hover:underline"
                      >
                        Affiliated Institutional profile
                      </a>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {/* Join the Editorial Board */}
      <section className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg mb-10">
        <h2 className="text-2xl font-semibold mb-3 text-slate-800">Interested in Joining the Editorial Board?</h2>
        <p className="mb-4">
          IJEPA welcomes qualified academics and industry professionals to contribute as Associate Editors or Reviewers. If you have a strong research background and a commitment to scholarly excellence, we invite you to apply.
        </p>
        <a
          href="/joinusedito"
          className="inline-block bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-6 rounded-md transition-colors"
        >
          Apply Now
        </a>
      </section>

      {/* Contact */}
      <section className="text-center text-slate-600">
        <p>
          For inquiries regarding the Editorial Board, please contact the Editorial Office at{' '}
          <a href="mailto:editorial@ijepa.org" className="text-amber-600 hover:underline">editorial@ijepa.org</a>.
        </p>
      </section>
    </div>
  );
};

export default EditorialBoard;