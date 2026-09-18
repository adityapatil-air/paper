-- Run this SQL in Supabase SQL Editor to seed the Editorial Board list
-- It inserts into the site_settings table under key 'editorial_board'
-- Admin Dashboard will then be able to edit/reorder/remove members

INSERT INTO site_settings (key, value, updated_at)
VALUES (
  'editorial_board',
  '[
    {
      "id": "eic_1",
      "section": "Editor-in-Chief",
      "name": "Dr. Navnath D. Kale",
      "title": "Senior Assistant Professor, Dept. of Computer Engineering",
      "affiliation": "MIT Academy of Engineering, Pune, India.",
      "email": "editor@ijepa.org, navnath.kale@mitaoe.ac.in",
      "profileUrl": "https://mitaoe.ac.in/school-of-computer-engineering-n-d-kale.php",
      "sortOrder": 0
    },
    {
      "id": "ae_1",
      "section": "Associate Editors",
      "name": "Dr. Yogesh Gurav",
      "title": "Dean Academics & Research",
      "affiliation": "Dr. D. Y. Patil Technical Campus, Talegaon, Pune, India",
      "email": "yogesh.gurav@dypatiltcs.com",
      "profileUrl": "https://www.dypatiltcs.com/from-academics-dean/",
      "sortOrder": 0
    },
    {
      "id": "ae_2",
      "section": "Associate Editors",
      "name": "Dr. M. Venkateshwara Rao",
      "title": "Professor, Dept. of Computer Science and Engineering",
      "affiliation": "Vignana Bharathi Institute of Technology, Ghatkesar, Hyderabad, India.",
      "email": "venkateshwara.rao@vbithyd.ac.in",
      "profileUrl": "https://vbithyd.ac.in/employees/dr-m-venkateswara-rao/",
      "sortOrder": 1
    },
    {
      "id": "ae_3",
      "section": "Associate Editors",
      "name": "Dr. Pramod Ganjewar",
      "title": "Head, Dept of Computer Engineering",
      "affiliation": "MIT Academy of Engineering, Pune, India.",
      "email": "pdganjewar@mitaoe.ac.in",
      "profileUrl": "https://mitaoe.ac.in/school-of-computer-engineering-and-technology-ganjewar.php",
      "sortOrder": 2
    },
    {
      "id": "ae_4",
      "section": "Associate Editors",
      "name": "Dr. Manish Giri",
      "title": "Head, Dept. of Computer Engineering (Software Engineering)",
      "affiliation": "MIT Academy of Engineering, Pune, India.",
      "email": "mbgiri@mitaoe.ac.in",
      "profileUrl": "https://mitaoe.ac.in/school-of-computer-engineering-and-technology-manish-giri.php",
      "sortOrder": 3
    },
    {
      "id": "ae_5",
      "section": "Associate Editors",
      "name": "Dr. G. Arun",
      "title": "Associate Professor, Dept. of Computer Science and Engineering",
      "affiliation": "Vignana Bharathi Institute of Technology, Ghatkesar, Hyderabad, India.",
      "email": "g.arun@vbithyd.ac.in",
      "profileUrl": "https://vbithyd.ac.in/employees/dr-g-arun/",
      "sortOrder": 4
    },
    {
      "id": "ae_6",
      "section": "Associate Editors",
      "name": "Dr. Mukesh Kumar Tripathi",
      "title": "",
      "affiliation": "KIET group of institutions, Delhi- NCR, Ghaziabad, India",
      "email": "mukesh.kumar@kiet.edu",
      "profileUrl": "https://www.kiet.edu/programs/undergraduate-programs/cse-aiml/faculty/",
      "sortOrder": 5
    },
    {
      "id": "ae_7",
      "section": "Associate Editors",
      "name": "Prof. Ayub A. Tamboli",
      "title": "Principal",
      "affiliation": "Zeal Polytechnic, Pune, India",
      "email": "polytechnic@zealeducation.com",
      "profileUrl": "https://zealpolytechnic.com/principals-message/",
      "sortOrder": 6
    },
    {
      "id": "ae_8",
      "section": "Associate Editors",
      "name": "Dr. S. N. Patil",
      "title": "Principal",
      "affiliation": "Yashoda Mahadeo Kakade College of Engineering, Talegaon, Pune",
      "email": "principal@ymkcoe.com",
      "profileUrl": "https://ymkcoe.com/PRINCIPAL.php",
      "sortOrder": 7
    },
    {
      "id": "ae_9",
      "section": "Associate Editors",
      "name": "Dr. Vijaykumar P. Mantri",
      "title": "Senior Assistant Professor",
      "affiliation": "MIT Academy of Engineering, Pune, India",
      "email": "vijay.mantri@mitaoe.ac.in",
      "profileUrl": "https://mitaoe.ac.in/school-of-computer-engineering-vijaykumar-mantri.php",
      "sortOrder": 8
    },
    {
      "id": "ae_10",
      "section": "Associate Editors",
      "name": "Dr. Anand Soni",
      "title": "Faculty- School of Business",
      "affiliation": "Bahrain Polytechnic, Kingdom of Bahrain",
      "email": "anand.soni@polytechnic.bh",
      "profileUrl": "",
      "sortOrder": 9
    }
  ]'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
