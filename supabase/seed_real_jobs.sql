-- Seed real-world Thai companies and active job openings for the career platform.
-- วิธีใช้: copy ทั้งไฟล์ไปวางใน Supabase Dashboard > SQL Editor > Run
-- รันซ้ำได้อย่างปลอดภัย (ON CONFLICT do nothing / upsert)
-- ต้องรัน `supabase/add_career_platform.sql` ก่อนเพื่อสร้างตาราง companies, jobs และ RLS
-- ไม่มีตารางหรือคอลัมน์เกี่ยวกับการชำระเงินหรือการสมัครสมาชิกแบบเสียค่าบริการ

-- 1) บริษัทจริง (จำลอง) ครอบคลุมหลากหลายอุตสาหกรรม
insert into public.companies (id, name, industry, location, website, description) values
  ('seed-company-tek-isan', 'บริษัท เทคอีสาน โซลูชันส์ จำกัด', 'เทคโนโลยีสารสนเทศ', 'ขอนแก่น', 'https://example.com/tek-isan',
   'บ้านพัฒนาซอฟต์แวร์และดิจิทัลโซลูชันสำหรับธุรกิจในภาคตะวันออกเฉียงเหนือ รับพัฒนาเว็บแอปและระบบฐานข้อมูลองค์กร'),
  ('seed-company-datawise', 'บริษัท ดาต้าไวซ์ เอ็นาไลติกส์ จำกัด', 'เทคโนโลยีสารสนเทศ', 'กรุงเทพมหานคร', 'https://example.com/datawise',
   'ที่ปรึกษาด้านข้อมูลและ AI ช่วยองค์กรตัดสินใจจากข้อมูลจริง มีทีมดาต้าเอนจิเนียร์และนักวิเคราะห์มืออาชีพ'),
  ('seed-company-loei-creative', 'บริษัท เลยครีเอทีฟ ออแกไนซ์ จำกัด', 'การตลาดและการโฆษณา', 'เลย', 'https://example.com/loei-creative',
   'สตูดิโอออกแบบแบรนด์และสื่อดิจิทัลสำหรับธุรกิจท่องเที่ยวและชุมชนในจังหวัดเลยและภาคอีสาน'),
  ('seed-company-securenorth', 'บริษัท ซิเคียวร์นอร์ท จำกัด', 'เทคโนโลยีสารสนเทศ', 'กรุงเทพมหานคร', 'https://example.com/securenorth',
   'ผู้ให้บริการตรวจประเมินและป้องกันความมั่นคงปลอดภัยไซเบอร์สำหรับหน่วยงานภาครัฐและเอกชน'),
  ('seed-company-isan-finance', 'บริษัท อีสานการเงิน แอไซดิไวซ์ จำกัด', 'การเงินและบัญชี', 'ขอนแก่น', 'https://example.com/isan-finance',
   'ที่ปรึกษาการเงินและบัญชีสำหรับ SMEs ในภาคตะวันออกเฉียงเหนือ ให้บริการทำบัญชี ภาษี และวางแผนการเงิน'),
  ('seed-company-learnloop', 'บริษัท ลีกลูป เอ็ดเทค จำกัด', 'การศึกษา', 'กรุงเทพมหานคร', 'https://example.com/learnloop',
   'แพลตฟอร์มเรียนรู้ออนไลน์และสื่อการสอนแบบมีปฏิสัมพันธ์สำหรับโรงเรียนและมหาวิทยาลัยทั่วไทย'),
  ('seed-company-loei-hotel', 'บริษัท โฮเทลเลย รีสอร์ท แอนด์ สปา จำกัด', 'โรงแรมและการบริการ', 'เลย', 'https://example.com/loei-hotel',
   'รีสอร์ทและสปาระดับ 4 ดาวใจกลางจังหวัดเลย ให้บริการที่พักและจัดกิจกรรมท่องเที่ยวเชิงอนุรักษ์'),
  ('seed-company-visawa-isan', 'บริษัท วิศวะอีสาน จำกัด', 'วิศวกรรม', 'ขอนแก่น', 'https://example.com/visawa-isan',
   'บริษัทวิศวกรรมก่อสร้างและออกแบบระบบโครงสร้างพื้นฐานสำหรับโครงการภาครัฐและภาคเอกชนในภาคอีสาน'),
  ('seed-company-global-tourism', 'บริษัท โกลบอลทูริซึม ไทย จำกัด', 'โรงแรมและการบริการ', 'กรุงเทพมหานคร', 'https://example.com/global-tourism',
   'เอเจนซี่ท่องเที่ยวและบริการนำเที่ยวครบวงจร เน้นกลุ่มนักท่องเที่ยวต่างชาติและทัวร์ในประเทศ'),
  ('seed-company-remote-thai', 'บริษัท รีมอทเวิร์กไทย จำกัด', 'เทคโนโลยีสารสนเทศ', 'รีโมท', 'https://example.com/remote-thai',
   'ทีมพัฒนาซอฟต์แวร์แบบเต็มรูปแบบที่ทำงานจากทุกที่ทั่วประเทศ เน้น React Native และระบบคลาวด์')
on conflict (id) do update set
  name = excluded.name,
  industry = excluded.industry,
  location = excluded.location,
  website = excluded.website,
  description = excluded.description,
  updated_at = now();

-- 2) ประกาศรับสมัครงานจริง (active = true) ครบทุกสาขาที่กำหนด
insert into public.jobs (id, company_id, title, description, responsibilities, location, work_mode, employment_type, required_skills, nice_to_have, career_en, career_category, salary_range, apply_url, is_active) values
  -- IT — TEK-ISAN Solutions (ขอนแก่น)
  ('seed-job-frontend-dev', 'seed-company-tek-isan', 'Frontend Developer (React / Next.js)',
   'ร่วมพัฒนาหน้าเว็บแอปพลิเคชันสำหรับลูกค้าองค์กรในภาคอีสาน ทำงานร่วมกับนักออกแบบและทีม backend เพื่อส่งมอบประสบการณ์ใช้งานที่ดีบนทุกอุปกรณ์',
   ARRAY['พัฒนา UI ด้วย React และ Next.js', 'เชื่อมต่อ REST API และจัดการ state ของหน้าเว็บ', 'ตรวจสอบคุณภาพและ performance ของหน้าเว็บ', 'ทำงานร่วมกับทีมดีไซน์เพื่อถ่ายทอด Figma เป็นโค้ด'],
   'ขอนแก่น', 'hybrid', 'พนักงานประจำ',
   ARRAY['React', 'JavaScript', 'HTML', 'CSS', 'Git'], ARRAY['TypeScript', 'Next.js', 'Figma'],
   'Software Engineer', 'เทคโนโลยีสารสนเทศ', '20,000 – 35,000 บาท',
   'mailto:career@tek-isan.example.com?subject=Frontend%20Developer', true),

  ('seed-job-fullstack-dev', 'seed-company-tek-isan', 'Full Stack Developer (Node.js / React)',
   'พัฒนาระบบเว็บแอปแบบ end-to-end ตั้งแต่ฐานข้อมูลจนถึงหน้าแสดงผล รองรับลูกค้าองค์กรและสตาร์ทอัพในภูมิภาค',
   ARRAY['ออกแบบและสร้าง REST API ด้วย Node.js และ Express', 'พัฒนาฟรอนท์เอนด์ด้วย React', 'จัดการฐานข้อมูล PostgreSQL', 'ติดตั้งและดูแลระบบบนเซิร์ฟเวอร์'],
   'ขอนแก่น', 'hybrid', 'พนักงานประจำ',
   ARRAY['Node.js', 'React', 'JavaScript', 'SQL', 'Git'], ARRAY['TypeScript', 'Next.js', 'Docker', 'AWS'],
   'Software Engineer', 'เทคโนโลยีสารสนเทศ', '25,000 – 45,000 บาท',
   'mailto:career@tek-isan.example.com?subject=Full%20Stack%20Developer', true),

  -- IT / Data — DataWise Analytics (กรุงเทพฯ)
  ('seed-job-data-analyst', 'seed-company-datawise', 'Junior Data Analyst',
   'วิเคราะห์ข้อมูลธุรกิจ จัดทำแดชบอร์ด และสรุป Insight ให้ทีมธุรกิจและลูกค้า เพื่อสนับสนุนการตัดสินใจเชิงข้อมูล',
   ARRAY['ทำความสะอาดและวิเคราะห์ข้อมูลด้วย SQL และ Python', 'สร้างรายงานและแดชบอร์ดเชิงภาพ', 'นำเสนอผลการวิเคราะห์ให้ผู้มีส่วนได้ส่วนเสีย', 'ดูแลคุณภาพข้อมูลในคลังข้อมูลองค์กร'],
   'กรุงเทพมหานคร', 'hybrid', 'พนักงานประจำ',
   ARRAY['SQL', 'Python', 'Excel', 'Data Visualization'], ARRAY['Power BI', 'Tableau', 'Statistics'],
   'Data Scientist', 'เทคโนโลยีสารสนเทศ', '22,000 – 38,000 บาท',
   'mailto:hr@datawise.example.com?subject=Junior%20Data%20Analyst', true),

  ('seed-job-devops', 'seed-company-datawise', 'DevOps Engineer',
   'ดูแลระบบคลาวด์ โครงสร้างพื้นฐาน CI/CD และการปรับประสิทธิภาพของแอปพลิเคชันให้รองรับผู้ใช้จำนวนมาก',
   ARRAY['สร้างและดูแลโครงสร้างพื้นฐานบน AWS หรือ GCP', 'เขียนสคริปต์ CI/CD สำหรับการdeployอัตโนมัติ', 'ติดตามระบบและแก้ไขปัญหา production incident', 'จัดการ container ด้วย Docker และ Kubernetes'],
   'กรุงเทพมหานคร', 'hybrid', 'พนักงานประจำ',
   ARRAY['AWS', 'Docker', 'Linux', 'CI/CD', 'Git'], ARRAY['Kubernetes', 'Terraform', 'Python'],
   'Software Engineer', 'เทคโนโลยีสารสนเทศ', '30,000 – 55,000 บาท',
   'mailto:hr@datawise.example.com?subject=DevOps%20Engineer', true),

  -- IT / Cybersecurity — SecureNorth (กรุงเทพฯ)
  ('seed-job-security-analyst', 'seed-company-securenorth', 'Security Operations Analyst',
   'ติดตามเหตุการณ์ด้านความปลอดภัย วิเคราะห์ช่องโหว่ และช่วยทีมตอบสนองเหตุการณ์รักษาความปลอดภัยของลูกค้าองค์กร',
   ARRAY['ตรวจสอบ log และแจ้งเตือนจากระบบ SIEM', 'ประเมินช่องโหว่เบื้องต้นและแนะนำมาตรการป้องกัน', 'จัดทำรายงานเหตุการณ์ด้านความปลอดภัย', 'ประสานกับทีมไอทีในการแก้ไขช่องโหว่'],
   'กรุงเทพมหานคร', 'onsite', 'พนักงานประจำ',
   ARRAY['Network Security', 'Linux', 'SIEM', 'Incident Response'], ARRAY['Python', 'Cloud Security', 'CompTIA Security+'],
   'Cybersecurity Analyst', 'เทคโนโลยีสารสนเทศ', '24,000 – 40,000 บาท',
   'mailto:career@securenorth.example.com?subject=Security%20Operations%20Analyst', true),

  -- IT / Mobile — Remote Work Thailand (รีโมท)
  ('seed-job-mobile-dev', 'seed-company-remote-thai', 'Mobile Developer (React Native) — Remote',
   'พัฒนาแอปมือถือข้ามแพลตฟอร์มให้ลูกค้าทั้งในและต่างประเทศ ทำงานจากที่ไหนก็ได้และประสานงานออนไลน์เป็นหลัก',
   ARRAY['พัฒนาแอปด้วย React Native สำหรับ iOS และ Android', 'เชื่อมต่อ REST API และทดสอบบนอุปกรณ์จริง', 'ดูแล release และแก้ไขปัญหาหลังเปิดตัว', 'ทำงานร่วมกับทีมดีไซน์และแบ็กเอนด์ผ่านออนไลน์'],
   'รีโมท', 'remote', 'พนักงานประจำ',
   ARRAY['React Native', 'JavaScript', 'REST API', 'Git'], ARRAY['TypeScript', 'Firebase', 'UI/UX'],
   'Software Engineer', 'เทคโนโลยีสารสนเทศ', '25,000 – 42,000 บาท',
   'mailto:jobs@remote-thai.example.com?subject=Mobile%20Developer%20Remote', true),

  -- Marketing — Loei Creative (เลย)
  ('seed-job-digital-marketing', 'seed-company-loei-creative', 'Digital Marketing Strategist',
   'วางแผนและดำเนินแคมเปญออนไลน์ให้ธุรกิจท่องเที่ยวและสินค้าชุมชนในจังหวัดเลยและภาคอีสาน',
   ARRAY['วางแผนคอนเทนต์และแคมเปญโซเชียลมีเดีย', 'วิเคราะห์ผลโฆษณาและปรับกลยุทธ์ให้เกิดผลลัพธ์สูงสุด', 'ประสานงานกับทีมครีเอทีฟในการผลิตสื่อ', 'ดูแลเพจเฟซบุ๊ก อินสตาแกรม และไลน์ของลูกค้า'],
   'เลย', 'hybrid', 'พนักงานประจำ',
   ARRAY['Digital Marketing', 'Social Media', 'Content Strategy', 'Google Analytics'], ARRAY['SEO', 'Copywriting', 'Canva'],
   'Marketing Strategist', 'ธุรกิจและการตลาด', '18,000 – 32,000 บาท',
   'mailto:hr@loei-creative.example.com?subject=Digital%20Marketing%20Strategist', true),

  ('seed-job-social-media', 'seed-company-global-tourism', 'Social Media Manager',
   'ดูแลและเติบโตช่องทางโซเชียลมีเดียของบริษัทท่องเที่ยว สร้างการมีส่วนร่วมกับนักท่องเที่ยวทั่วโลก',
   ARRAY['วางแผนและโพสต์คอนเทนต์บนโซเชียลมีเดียทุกแพลตฟอร์ม', 'ตอบโต้และดูแลความสัมพันธ์กับผู้ติดตาม', 'วิเคราะห์เมตริกการมีส่วนร่วมและปรับกลยุทธ์', 'ทำงานร่วมกับทีมกราฟิกในการผลิตภาพและวิดีโอ'],
   'กรุงเทพมหานคร', 'onsite', 'พนักงานประจำ',
   ARRAY['Social Media', 'Content Strategy', 'Copywriting', 'Canva'], ARRAY['SEO', 'Digital Marketing', 'Graphic Design'],
   'Marketing Strategist', 'ธุรกิจและการตลาด', '20,000 – 35,000 บาท',
   'mailto:hr@global-tourism.example.com?subject=Social%20Media%20Manager', true),

  -- Finance — Isan Finance Advisory (ขอนแก่น)
  ('seed-job-financial-analyst', 'seed-company-isan-finance', 'Financial Analyst (Junior)',
   'จัดทำแบบจำลองทางการเงิน วิเคราะห์ต้นทุน และสนับสนุนการวางแผนธุรกิจของลูกค้า SMEs ในภาคตะวันออกเฉียงเหนือ',
   ARRAY['วิเคราะห์งบการเงินและต้นทุนของลูกค้า', 'จัดทำรายงานและแบบจำลองทางการเงิน', 'นำเสนอผลวิเคราะห์ให้ลูกค้าและทีมภายใน', 'ติดตามประสิทธิภาพทางการเงินรายเดือน'],
   'ขอนแก่น', 'onsite', 'พนักงานประจำ',
   ARRAY['Excel', 'Financial Analysis', 'Accounting', 'Data Visualization'], ARRAY['Power BI', 'SQL', 'Business Strategy'],
   'Finance Analyst', 'การเงินและบัญชี', '20,000 – 33,000 บาท',
   'mailto:career@isan-finance.example.com?subject=Financial%20Analyst', true),

  ('seed-job-accountant', 'seed-company-isan-finance', 'Accountant',
   'รับผิดชอบงานบัญชีทั่วไป ภาษี และการปิดบัญชีรายเดือนสำหรับลูกค้า SMEs และนิติบุคคล',
   ARRAY['บันทึกรายรับรายจ่ายและกระทบยอดบัญชี', 'จัดทำภาษีและเอกสารทางบัญชี', 'ปิดบัญชีรายเดือนและรายปี', 'ให้คำปรึกษาด้านภาษีอากรเบื้องต้น'],
   'กรุงเทพมหานคร', 'onsite', 'พนักงานประจำ',
   ARRAY['Accounting', 'Excel', 'Financial Analysis', 'Tax'], ARRAY['Power BI', 'QuickBooks', 'Business Strategy'],
   'Finance Analyst', 'การเงินและบัญชี', '18,000 – 30,000 บาท',
   'mailto:career@isan-finance.example.com?subject=Accountant', true),

  -- Engineering — Visawa Isan (ขอนแก่น)
  ('seed-job-civil-engineer', 'seed-company-visawa-isan', 'Civil Engineer',
   'ออกแบบและควบคุมงานก่อสร้างโครงสร้างพื้นฐาน เช่น ถนน สะพาน และอาคารสาธารณะในภาคอีสาน',
   ARRAY['ออกแบบโครงสร้างพื้นฐานด้านโยธา', 'ควบคุมดูแลงานก่อสร้างในไซต์งาน', 'ตรวจสอบแบบก่อสร้างและเอกสารขออนุญาต', 'ประสานงานกับหน่วยงานรัฐและผู้รับเหมา'],
   'ขอนแก่น', 'onsite', 'พนักงานประจำ',
   ARRAY['AutoCAD', 'Civil Engineering', 'Construction Management', 'Project Management'], ARRAY['Revit', 'BIM', 'STAAD.Pro'],
   'Engineering', 'วิศวกรรม', '22,000 – 38,000 บาท',
   'mailto:hr@visawa-isan.example.com?subject=Civil%20Engineer', true),

  ('seed-job-mechanical-engineer', 'seed-company-visawa-isan', 'Mechanical Engineer',
   'ออกแบบระบบกลและเครื่องจักรสำหรับโครงการอุตสาหกรรมในภาคอีสาน',
   ARRAY['ออกแบบระบบกลและเครื่องจักรด้วย CAD', 'ตรวจสอบและทดสอบต้นแบบระบบกล', 'ดูแลการบำรุงรักษาเครื่องจักรในโรงงาน', 'เขียนรายงานทางเทคนิคและขออนุญาต'],
   'ขอนแก่น', 'onsite', 'พนักงานประจำ',
   ARRAY['AutoCAD', 'Mechanical Engineering', 'SolidWorks', 'Project Management'], ARRAY['ANSYS', 'PLC', 'HVAC'],
   'Engineering', 'วิศวกรรม', '23,000 – 39,000 บาท',
   'mailto:hr@visawa-isan.example.com?subject=Mechanical%20Engineer', true),

  -- Education — LearnLoop EdTech (กรุงเทพฯ)
  ('seed-job-school-teacher', 'seed-company-learnloop', 'School Teacher (Secondary)',
   'สอนวิชาหลักในระดับมัธยมศึกษาบนแพลตฟอร์มการเรียนรู้ออนไลน์ของ LearnLoop พัฒนาสื่อการสอนและวัดผลการเรียน',
   ARRAY['สอนวิชาหลักผ่านแพลตฟอร์มออนไลน์', 'พัฒนาสื่อการสอนและแบบทดสอบ', 'วัดผลและติดตามพัฒนาการของนักเรียน', 'สื่อสารกับผู้ปกครองเกี่ยวกับผลการเรียน'],
   'กรุงเทพมหานคร', 'onsite', 'พนักงานประจำ',
   ARRAY['Teaching', 'Lesson Planning', 'Classroom Management', 'Communication'], ARRAY['Educational Technology', 'Curriculum Design', 'English'],
   'Education', 'การศึกษา', '18,000 – 30,000 บาท',
   'mailto:hr@learnloop.example.com?subject=School%20Teacher', true),

  ('seed-job-curriculum-designer', 'seed-company-learnloop', 'Curriculum Designer — Remote',
   'ออกแบบหลักสูตรและสาระการเรียนรู้สำหรับคอร์สออนไลน์ ทำงานจากที่ไหนก็ได้และประสานงานกับทีมครูและนักพัฒนา',
   ARRAY['ออกแบบกรอบหลักสูตรและสาระการเรียนรู้', 'สร้างสื่อประกอบการเรียนการสอน', 'ประเมินและปรับปรุงหลักสูตรตามผลการเรียน', 'ทำงานร่วมกับทีมครูและทีมพัฒนาซอฟต์แวร์'],
   'รีโมท', 'remote', 'พนักงานประจำ',
   ARRAY['Curriculum Design', 'Instructional Design', 'Educational Technology', 'Content Writing'], ARRAY['Graphic Design', 'LMS', 'Project Management'],
   'Education', 'การศึกษา', '25,000 – 40,000 บาท',
   'mailto:hr@learnloop.example.com?subject=Curriculum%20Designer%20Remote', true),

  -- Hospitality — Loei Hotel Resort & Spa (เลย)
  ('seed-job-hotel-manager', 'seed-company-loei-hotel', 'Hotel Manager',
   'จัดการดำเนินงานโรงแรมและรีสอร์ทในจังหวัดเลย ดูแลแผนกต้อนรับ งานบ้าน และบริการแขกผู้เข้าพัก',
   ARRAY['ดูแลการดำเนินงานของโรงแรมในภาพรวม', 'จัดการแผนกต้อนรับและแขกผู้เข้าพัก', 'ควบคุมงบประมาณและรายได้ของโรงแรม', 'ฝึกอบรมและดูแลพนักงานโรงแรม'],
   'เลย', 'onsite', 'พนักงานประจำ',
   ARRAY['Hotel Management', 'Customer Service', 'Team Leadership', 'Operations'], ARRAY['Revenue Management', 'English', 'Hospitality Management'],
   'Hospitality', 'โรงแรมและการบริการ', '25,000 – 40,000 บาท',
   'mailto:hr@loei-hotel.example.com?subject=Hotel%20Manager', true),

  ('seed-job-front-desk', 'seed-company-loei-hotel', 'Front Desk Officer',
   'ให้บริการแขกผู้เข้าพักที่โรงแรมในจังหวัดเลย ตั้งแต่เช็คอิน เช็คเอาต์ จนถึงการตอบคำถามและแนะนำสถานที่ท่องเที่ยว',
   ARRAY['ให้บริการเช็คอินและเช็คเอาต์แขกผู้เข้าพัก', 'ตอบคำถามและแนะนำสถานที่ท่องเที่ยวในจังหวัดเลย', 'จัดการการจองห้องพักและชำระเงิน', 'แก้ไขปัญหาและดูแลความพึงพอใจของแขก'],
   'เลย', 'onsite', 'พนักงานประจำ',
   ARRAY['Customer Service', 'Communication', 'English', 'Front Office'], ARRAY['Hospitality Management', 'Reservation System', 'Problem Solving'],
   'Hospitality', 'โรงแรมและการบริการ', '15,000 – 22,000 บาท',
   'mailto:hr@loei-hotel.example.com?subject=Front%20Desk%20Officer', true),

  -- Hospitality — Global Tourism Thailand (กรุงเทพฯ)
  ('seed-job-tour-coordinator', 'seed-company-global-tourism', 'Tour Coordinator',
   'ประสานงานจัดทัวร์และกิจกรรมท่องเที่ยวให้กับนักท่องเที่ยวต่างชาติและในประเทศทั่วไทย',
   ARRAY['ประสานงานจัดทัวร์และกิจกรรมท่องเที่ยว', 'จองที่พัก 交通 และร้านอาหารสำหรับนักท่องเที่ยว', 'ดูแลกลุ่มนักท่องเที่ยวระหว่างเดินทาง', 'แก้ไขปัญหาเฉพาะหน้าระหว่างการท่องเที่ยว'],
   'กรุงเทพมหานคร', 'onsite', 'พนักงานประจำ',
   ARRAY['Tour Coordination', 'Customer Service', 'English', 'Communication'], ARRAY['Chinese', 'Japanese', 'Travel Planning'],
   'Hospitality', 'โรงแรมและการบริการ', '18,000 – 28,000 บาท',
   'mailto:career@global-tourism.example.com?subject=Tour%20Coordinator', true)

on conflict (id) do update set
  company_id = excluded.company_id,
  title = excluded.title,
  description = excluded.description,
  responsibilities = excluded.responsibilities,
  location = excluded.location,
  work_mode = excluded.work_mode,
  employment_type = excluded.employment_type,
  required_skills = excluded.required_skills,
  nice_to_have = excluded.nice_to_have,
  career_en = excluded.career_en,
  career_category = excluded.career_category,
  salary_range = excluded.salary_range,
  apply_url = excluded.apply_url,
  is_active = excluded.is_active,
  updated_at = now();

-- 3) public SELECT RLS policies for active jobs (สาธารณะอ่านงานที่เปิดรับเท่านั้น)
--    ชื่อนโยบายเดียวกับ add_career_platform.sql เพื่อให้รันซ้ำได้อย่างปลอดภัย
drop policy if exists "jobs_public_read" on public.jobs;
create policy "jobs_public_read" on public.jobs
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists "companies_public_read" on public.companies;
create policy "companies_public_read" on public.companies
  for select to anon, authenticated
  using (true);

grant select on public.jobs to anon, authenticated;
grant select on public.companies to anon, authenticated;

-- หมายเหตุ: นโยบายเขียน/แก้ไข/ลบ ยังคงจำกัดเฉพาะแอดมินตามที่กำหนดใน add_career_platform.sql
-- และนโยบายสำหรับ resumes ยังคงเป็นของเจ้าของเท่านั้น
