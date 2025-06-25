import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'th' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // App
    'app_title': 'LiQid',
    'get_started': 'Get Started',
    
    // Auth
    'sign_up': 'Sign Up',
    'sign_in': 'Sign In',
    'email': 'Email',
    'password': 'Password',
    'remember_me': 'Remember me',
    'forgot_password': 'Forgot password?',
    'create_account': 'Create Account',
    'already_have_account': 'Already have an account?',
    'dont_have_account': "Don't have an account?",
    'or_continue_with': 'Or continue with',
    'transform_stories': 'Transform your stories into professional screenplays',
    'welcome_back': 'Welcome back to your screenplay workspace',
    
    // Onboarding
    'personal_info': 'Personal Information',
    'tell_us_about_yourself': 'Tell us a bit about yourself to personalize your experience',
    'first_name': 'First Name',
    'last_name': 'Last Name',
    'nickname': 'Nickname',
    'birth_date': 'Birth Date',
    'next': 'Next',
    'back': 'Back',
    'complete': 'Complete',
    'your_occupation': 'Your Occupation',
    'select_your_role': 'Select your primary role in the film industry',
    'screenwriter': 'Screenwriter',
    'director': 'Director',
    'producer': 'Producer',
    'assistant_director': 'Assistant Director',
    'cinematographer': 'Cinematographer',
    'crew': 'Crew',
    
    // Dashboard
    'dashboard': 'Dashboard',
    'projects': 'Projects',
    'my_company': 'My Company',
    'company_console': 'Company Console',
    'team': 'Team',
    'profile': 'Profile',
    'premium_plan': 'Premium Plan',
    'search_all': 'Search projects...',
    'quick_actions': 'Quick Actions',
    'new_project': 'New Project',
    'invite_team': 'Invite Team',
    'manage_company': 'Manage Company',
    'recent_projects': 'Recent Projects',
    'view_all': 'View All',
    'updated': 'Updated',
    'scenes': 'scenes',
    'recent_activity': 'Recent Activity',
    'edited': 'edited',
    'joined': 'joined',
    'commented': 'commented on',
    'in': 'in',
    
    // Profile
    'edit_profile': 'Edit Profile',
    'account_details': 'Account Details',
    'company_affiliations': 'Company Affiliations',
    'member_since': 'Member Since',
    'location': 'Location',
    'phone': 'Phone',
    'active_projects': 'Active Projects',
    'scripts': 'Scripts',
    'collaborators': 'Collaborators',
    'primary': 'Primary',
    'active': 'Active',
    'leave_company': 'Leave Company',
    'create_company': 'Create Company',
    'company_name': 'Company Name',
    'company_logo': 'Company Logo',
    'company_description': 'Company Description',
    'address': 'Address',
    'your_role': 'Your Role',
    'cancel': 'Cancel',
    'save_changes': 'Save Changes',
    
    // Admin Console
    'admin_console': 'Admin Console',
    'manage_settings': 'Manage your company settings, team members, and projects',
    'overview': 'Overview',
    'members': 'Members',
    'roles': 'Roles',
    'company_profile': 'Company Profile',
    'financial_info': 'Financial Information',
    'current_plan': 'Current Plan',
    'payment_method': 'Payment Method',
    'billing_history': 'Billing History',
    'pending_invites': 'Pending Invites',
    'invite_members': 'Invite Members',
    
    // Member Management
    'member_management': 'Member Management',
    'manage_team_members': 'Manage your team members and their access levels',
    'add_member': 'Add Member',
    'search_members': 'Search members by name or email',
    'role': 'Role',
    'status': 'Status',
    'last_active': 'Last Active',
    'actions': 'Actions',
    'remove_member': 'Remove Member',
    'remove_confirm': 'This action cannot be undone. The member will lose access to all projects and company resources.',
    'change_role': 'Change Role',
    'deactivate': 'Deactivate',
    'remove': 'Remove',
    'export_member_list': 'Export Member List',
    
    // Member Invite
    'invite_team_members': 'Invite Team Members',
    'send_invitations': 'Send invitations to collaborate on your projects',
    'email_invitations': 'Email Invitations',
    'email_address': 'Email Address',
    'add_another_invitation': 'Add Another Invitation',
    'personalized_message': 'Personalized Message (Optional)',
    'personalized_message_placeholder': 'Add a personal note to your invitation...',
    'invite_info': 'Invitees will receive an email with a link to join your company.',
    'bulk_invite': 'Bulk Invite via CSV',
    'upload_csv': 'Upload CSV File',
    'download_template': 'Download Template',
    'preview_csv': 'Preview CSV Import',
    'send_invites': 'Send Invites',
    'invitations_sent': 'Invitations Sent Successfully',
    'invitations_sent_desc': 'Your team members will receive an email with instructions to join.',
    
    // Role Management
    'role_management': 'Role Management',
    'define_roles': 'Define roles and permissions for your team members',
    'create_role': 'Create Role',
    'role_info': 'Roles define what team members can do within your company.',
    'system_roles_info': 'System roles cannot be deleted, but you can customize their permissions.',
    'role_name': 'Role Name',
    'description': 'Description',
    'default': 'Default',
    'set_as_default': 'Set as Default',
    'system_role': 'System Role',
    'edit_role': 'Edit Role',
    'delete_role': 'Delete Role',
    'delete_role_confirm': 'This action cannot be undone. Members with this role will need to be reassigned.',
    'all_permissions': 'All Permissions',
    'permissions': 'Permissions',
    'make_default_role': 'Make this the default role for new members',
    
    // Project Management
    'project_management': 'Project Management',
    'manage_projects': 'Manage all company projects and their team members',
    'create_project': 'Create Project',
    'search_projects': 'Search projects by title',
    'type': 'Type',
    'project': 'Project',
    'last_updated': 'Last Updated',
    'created': 'Created',
    'delete_project': 'Delete Project',
    'delete_project_confirm': 'This action cannot be undone. All project data, including scripts and assets, will be permanently deleted.',
    'archive': 'Archive',
    'export': 'Export',
    'duplicate': 'Duplicate',
    'export_project_list': 'Export Project List',
    
    // Editor
    'scene-heading': 'Scene Heading',
    'action': 'Action',
    'character': 'Character',
    'parenthetical': 'Parenthetical',
    'dialogue': 'Dialogue',
    'transition': 'Transition',
    'text': 'Text',
    'shot': 'Shot',
    'editor_instruction': 'Press Tab to cycle through formats, Enter to create new blocks following screenplay rules',
    'click_to_edit_header': 'Click to edit header',
    'click_to_edit_footer': 'Click to edit footer',
    
    // Scene Types
    'interior_scene': 'Interior scene',
    'exterior_scene': 'Exterior scene',
    'interior_exterior_scene': 'Interior to exterior scene',
    'exterior_interior_scene': 'Exterior to interior scene',
    
    // Transitions
    'cut_to_desc': 'Standard cut to next scene',
    'fade_out_desc': 'Fade to black',
    'fade_in_desc': 'Fade in from black',
    'dissolve_to_desc': 'Dissolve to next scene',
    'smash_cut_desc': 'Abrupt transition',
    'match_cut_desc': 'Visual elements match between scenes',
    
    // Shot Types
    'wide_shot_desc': 'Shows entire scene from distance',
    'close_up_desc': 'Shows detail, typically of face',
    'medium_shot_desc': 'Shows character from waist up',
    'tracking_shot_desc': 'Camera follows subject',
    'pov_shot_desc': 'From character\'s perspective',
    'aerial_shot_desc': 'Shot from above',
    'dolly_shot_desc': 'Camera moves on tracks',
    'establishing_shot_desc': 'Shows location context',
    'extreme_close_up_desc': 'Very tight on detail',
    'crane_shot_desc': 'Camera moves vertically',
    
    // Enter Rules
    'enter_rules_title': 'Enter Key Behavior',
    'enter_rule_scene': 'Creates a new Action block',
    'enter_rule_action': 'Creates a new Character block',
    'enter_rule_character': 'Creates a new Dialogue block',
    'enter_rule_parenthetical': 'Creates a new Dialogue block',
    'enter_rule_dialogue': 'Creates a new Character block',
    'enter_rule_dialogue_double': 'Double-press Enter creates an Action block',
    'enter_rule_transition': 'Creates a new Scene Heading block',
    'enter_rule_text': 'Creates a new Action block',
    'enter_rule_shot': 'Creates a new Action block',
    
    // Tips
    'tip_tab_format': 'Press Tab to cycle through block formats',
    'tip_enter_newline': 'Press Enter to create a new line following screenplay format',
    'tip_scene_heading': 'Type INT. or EXT. to automatically format as Scene Heading',
    'tip_shortcuts': 'Use Alt+1-8 to quickly change block formats',
    
    // Footer
    'developed_by': 'Developed by Studio Commuan, experts in film technology',
    'all_rights_reserved': 'All rights reserved.'
  },
  th: {
    // App
    'app_title': 'ลิขิต',
    'get_started': 'เริ่มต้นใช้งาน',
    
    // Auth
    'sign_up': 'สมัครสมาชิก',
    'sign_in': 'เข้าสู่ระบบ',
    'email': 'อีเมล',
    'password': 'รหัสผ่าน',
    'remember_me': 'จดจำฉัน',
    'forgot_password': 'ลืมรหัสผ่าน?',
    'create_account': 'สร้างบัญชี',
    'already_have_account': 'มีบัญชีอยู่แล้ว?',
    'dont_have_account': 'ยังไม่มีบัญชี?',
    'or_continue_with': 'หรือดำเนินการต่อด้วย',
    'transform_stories': 'เปลี่ยนเรื่องราวของคุณให้เป็นบทภาพยนตร์มืออาชีพ',
    'welcome_back': 'ยินดีต้อนรับกลับสู่พื้นที่ทำงานบทภาพยนตร์ของคุณ',
    
    // Onboarding
    'personal_info': 'ข้อมูลส่วนตัว',
    'tell_us_about_yourself': 'บอกเราเกี่ยวกับตัวคุณเพื่อปรับแต่งประสบการณ์ของคุณ',
    'first_name': 'ชื่อ',
    'last_name': 'นามสกุล',
    'nickname': 'ชื่อเล่น',
    'birth_date': 'วันเกิด',
    'next': 'ถัดไป',
    'back': 'ย้อนกลับ',
    'complete': 'เสร็จสิ้น',
    'your_occupation': 'อาชีพของคุณ',
    'select_your_role': 'เลือกบทบาทหลักของคุณในอุตสาหกรรมภาพยนตร์',
    'screenwriter': 'นักเขียนบท',
    'director': 'ผู้กำกับ',
    'producer': 'โปรดิวเซอร์',
    'assistant_director': 'ผู้ช่วยผู้กำกับ',
    'cinematographer': 'ช่างภาพ',
    'crew': 'ทีมงาน',
    
    // Dashboard
    'dashboard': 'แดชบอร์ด',
    'projects': 'โปรเจกต์',
    'my_company': 'บริษัทของฉัน',
    'company_console': 'คอนโซลบริษัท',
    'team': 'ทีม',
    'profile': 'โปรไฟล์',
    'premium_plan': 'แผนพรีเมียม',
    'search_all': 'ค้นหาโปรเจกต์...',
    'quick_actions': 'การดำเนินการด่วน',
    'new_project': 'โปรเจกต์ใหม่',
    'invite_team': 'เชิญทีม',
    'manage_company': 'จัดการบริษัท',
    'recent_projects': 'โปรเจกต์ล่าสุด',
    'view_all': 'ดูทั้งหมด',
    'updated': 'อัปเดตเมื่อ',
    'scenes': 'ฉาก',
    'recent_activity': 'กิจกรรมล่าสุด',
    'edited': 'แก้ไข',
    'joined': 'เข้าร่วม',
    'commented': 'แสดงความคิดเห็นใน',
    'in': 'ใน',
    
    // Profile
    'edit_profile': 'แก้ไขโปรไฟล์',
    'account_details': 'รายละเอียดบัญชี',
    'company_affiliations': 'การเชื่อมโยงกับบริษัท',
    'member_since': 'เป็นสมาชิกตั้งแต่',
    'location': 'ตำแหน่งที่ตั้ง',
    'phone': 'โทรศัพท์',
    'active_projects': 'โปรเจกต์ที่ใช้งานอยู่',
    'scripts': 'บทภาพยนตร์',
    'collaborators': 'ผู้ร่วมงาน',
    'primary': 'หลัก',
    'active': 'ใช้งาน',
    'leave_company': 'ออกจากบริษัท',
    'create_company': 'สร้างบริษัท',
    'company_name': 'ชื่อบริษัท',
    'company_logo': 'โลโก้บริษัท',
    'company_description': 'คำอธิบายบริษัท',
    'address': 'ที่อยู่',
    'your_role': 'บทบาทของคุณ',
    'cancel': 'ยกเลิก',
    'save_changes': 'บันทึกการเปลี่ยนแปลง',
    
    // Admin Console
    'admin_console': 'คอนโซลผู้ดูแลระบบ',
    'manage_settings': 'จัดการการตั้งค่าบริษัท สมาชิกทีม และโปรเจกต์ของคุณ',
    'overview': 'ภาพรวม',
    'members': 'สมาชิก',
    'roles': 'บทบาท',
    'company_profile': 'โปรไฟล์บริษัท',
    'financial_info': 'ข้อมูลทางการเงิน',
    'current_plan': 'แผนปัจจุบัน',
    'payment_method': 'วิธีการชำระเงิน',
    'billing_history': 'ประวัติการเรียกเก็บเงิน',
    'pending_invites': 'คำเชิญที่รอดำเนินการ',
    'invite_members': 'เชิญสมาชิก',
    
    // Member Management
    'member_management': 'การจัดการสมาชิก',
    'manage_team_members': 'จัดการสมาชิกในทีมและระดับการเข้าถึงของพวกเขา',
    'add_member': 'เพิ่มสมาชิก',
    'search_members': 'ค้นหาสมาชิกตามชื่อหรืออีเมล',
    'role': 'บทบาท',
    'status': 'สถานะ',
    'last_active': 'ใช้งานล่าสุด',
    'actions': 'การดำเนินการ',
    'remove_member': 'ลบสมาชิก',
    'remove_confirm': 'การดำเนินการนี้ไม่สามารถยกเลิกได้ สมาชิกจะสูญเสียการเข้าถึงโปรเจกต์และทรัพยากรของบริษัททั้งหมด',
    'change_role': 'เปลี่ยนบทบาท',
    'deactivate': 'ปิดการใช้งาน',
    'remove': 'ลบ',
    'export_member_list': 'ส่งออกรายชื่อสมาชิก',
    
    // Member Invite
    'invite_team_members': 'เชิญสมาชิกทีม',
    'send_invitations': 'ส่งคำเชิญเพื่อร่วมงานในโปรเจกต์ของคุณ',
    'email_invitations': 'คำเชิญทางอีเมล',
    'email_address': 'ที่อยู่อีเมล',
    'add_another_invitation': 'เพิ่มคำเชิญอีก',
    'personalized_message': 'ข้อความส่วนตัว (ไม่บังคับ)',
    'personalized_message_placeholder': 'เพิ่มข้อความส่วนตัวในคำเชิญของคุณ...',
    'invite_info': 'ผู้ได้รับเชิญจะได้รับอีเมลพร้อมลิงก์เพื่อเข้าร่วมบริษัทของคุณ',
    'bulk_invite': 'เชิญจำนวนมากผ่าน CSV',
    'upload_csv': 'อัปโหลดไฟล์ CSV',
    'download_template': 'ดาวน์โหลดเทมเพลต',
    'preview_csv': 'ดูตัวอย่างการนำเข้า CSV',
    'send_invites': 'ส่งคำเชิญ',
    'invitations_sent': 'ส่งคำเชิญสำเร็จแล้ว',
    'invitations_sent_desc': 'สมาชิกในทีมของคุณจะได้รับอีเมลพร้อมคำแนะนำในการเข้าร่วม',
    
    // Role Management
    'role_management': 'การจัดการบทบาท',
    'define_roles': 'กำหนดบทบาทและสิทธิ์สำหรับสมาชิกในทีมของคุณ',
    'create_role': 'สร้างบทบาท',
    'role_info': 'บทบาทกำหนดว่าสมาชิกในทีมสามารถทำอะไรได้บ้างภายในบริษัทของคุณ',
    'system_roles_info': 'บทบาทระบบไม่สามารถลบได้ แต่คุณสามารถปรับแต่งสิทธิ์ได้',
    'role_name': 'ชื่อบทบาท',
    'description': 'คำอธิบาย',
    'default': 'ค่าเริ่มต้น',
    'set_as_default': 'ตั้งเป็นค่าเริ่มต้น',
    'system_role': 'บทบาทระบบ',
    'edit_role': 'แก้ไขบทบาท',
    'delete_role': 'ลบบทบาท',
    'delete_role_confirm': 'การดำเนินการนี้ไม่สามารถยกเลิกได้ สมาชิกที่มีบทบาทนี้จะต้องได้รับการกำหนดบทบาทใหม่',
    'all_permissions': 'สิทธิ์ทั้งหมด',
    'permissions': 'สิทธิ์',
    'make_default_role': 'ตั้งให้เป็นบทบาทเริ่มต้นสำหรับสมาชิกใหม่',
    
    // Project Management
    'project_management': 'การจัดการโปรเจกต์',
    'manage_projects': 'จัดการโปรเจกต์ทั้งหมดของบริษัทและสมาชิกในทีม',
    'create_project': 'สร้างโปรเจกต์',
    'search_projects': 'ค้นหาโปรเจกต์ตามชื่อ',
    'type': 'ประเภท',
    'project': 'โปรเจกต์',
    'last_updated': 'อัปเดตล่าสุด',
    'created': 'สร้างเมื่อ',
    'delete_project': 'ลบโปรเจกต์',
    'delete_project_confirm': 'การดำเนินการนี้ไม่สามารถยกเลิกได้ ข้อมูลโปรเจกต์ทั้งหมด รวมถึงบทและสินทรัพย์ จะถูกลบอย่างถาวร',
    'archive': 'เก็บถาวร',
    'export': 'ส่งออก',
    'duplicate': 'ทำซ้ำ',
    'export_project_list': 'ส่งออกรายการโปรเจกต์',
    
    // Editor
    'scene-heading': 'หัวฉาก',
    'action': 'แอคชั่น',
    'character': 'ตัวละคร',
    'parenthetical': 'วงเล็บ',
    'dialogue': 'บทสนทนา',
    'transition': 'การเปลี่ยนฉาก',
    'text': 'ข้อความ',
    'shot': 'ช็อต',
    'editor_instruction': 'กด Tab เพื่อสลับรูปแบบ, Enter เพื่อสร้างบล็อกใหม่ตามกฎของบทภาพยนตร์',
    'click_to_edit_header': 'คลิกเพื่อแก้ไขส่วนหัว',
    'click_to_edit_footer': 'คลิกเพื่อแก้ไขส่วนท้าย',
    
    // Scene Types
    'interior_scene': 'ฉากภายในอาคาร',
    'exterior_scene': 'ฉากภายนอกอาคาร',
    'interior_exterior_scene': 'ฉากจากภายในสู่ภายนอกอาคาร',
    'exterior_interior_scene': 'ฉากจากภายนอกสู่ภายในอาคาร',
    
    // Transitions
    'cut_to_desc': 'ตัดไปยังฉากถัดไป',
    'fade_out_desc': 'เฟดเป็นสีดำ',
    'fade_in_desc': 'เฟดจากสีดำ',
    'dissolve_to_desc': 'ค่อยๆ เปลี่ยนไปยังฉากถัดไป',
    'smash_cut_desc': 'การเปลี่ยนฉากแบบฉับพลัน',
    'match_cut_desc': 'องค์ประกอบภาพที่เหมือนกันระหว่างฉาก',
    
    // Shot Types
    'wide_shot_desc': 'แสดงฉากทั้งหมดจากระยะไกล',
    'close_up_desc': 'แสดงรายละเอียด โดยทั่วไปเป็นใบหน้า',
    'medium_shot_desc': 'แสดงตัวละครจากเอวขึ้นไป',
    'tracking_shot_desc': 'กล้องติดตามวัตถุ',
    'pov_shot_desc': 'จากมุมมองของตัวละคร',
    'aerial_shot_desc': 'ถ่ายจากด้านบน',
    'dolly_shot_desc': 'กล้องเคลื่อนที่บนราง',
    'establishing_shot_desc': 'แสดงบริบทของสถานที่',
    'extreme_close_up_desc': 'ซูมเข้าใกล้มากที่รายละเอียด',
    'crane_shot_desc': 'กล้องเคลื่อนที่ในแนวตั้ง',
    
    // Enter Rules
    'enter_rules_title': 'พฤติกรรมของปุ่ม Enter',
    'enter_rule_scene': 'สร้างบล็อกแอคชั่นใหม่',
    'enter_rule_action': 'สร้างบล็อกตัวละครใหม่',
    'enter_rule_character': 'สร้างบล็อกบทสนทนาใหม่',
    'enter_rule_parenthetical': 'สร้างบ ล็อกบทสนทนาใหม่',
    'enter_rule_dialogue': 'สร้างบล็อกตัวละครใหม่',
    'enter_rule_dialogue_double': 'กด Enter สองครั้งเพื่อสร้างบล็อกแอคชั่น',
    'enter_rule_transition': 'สร้างบล็อกหัวฉากใหม่',
    'enter_rule_text': 'สร้างบล็อกแอคชั่นใหม่',
    'enter_rule_shot': 'สร้างบล็อกแอคชั่นใหม่',
    
    // Tips
    'tip_tab_format': 'กด Tab เพื่อสลับรูปแบบบล็อก',
    'tip_enter_newline': 'กด Enter เพื่อสร้างบรรทัดใหม่ตามรูปแบบบทภาพยนตร์',
    'tip_scene_heading': 'พิมพ์ INT. หรือ EXT. เพื่อจัดรูปแบบเป็นหัวฉากโดยอัตโนมัติ',
    'tip_shortcuts': 'ใช้ Alt+1-8 เพื่อเปลี่ยนรูปแบบบล็อกอย่างรวดเร็ว',
    
    // Footer
    'developed_by': 'พัฒนาโดย Studio Commuan ผู้เชี่ยวชาญด้านเทคโนโลยีภาพยนตร์',
    'all_rights_reserved': 'สงวนลิขสิทธิ์'
  },
  zh: {
    // App
    'app_title': '流刻',
    'get_started': '开始使用',
    
    // Auth
    'sign_up': '注册',
    'sign_in': '登录',
    'email': '电子邮件',
    'password': '密码',
    'remember_me': '记住我',
    'forgot_password': '忘记密码？',
    'create_account': '创建账户',
    'already_have_account': '已有账户？',
    'dont_have_account': '没有账户？',
    'or_continue_with': '或继续使用',
    'transform_stories': '将您的故事转变为专业剧本',
    'welcome_back': '欢迎回到您的剧本工作区',
    
    // Onboarding
    'personal_info': '个人信息',
    'tell_us_about_yourself': '告诉我们一些关于您的信息，以个性化您的体验',
    'first_name': '名',
    'last_name': '姓',
    'nickname': '昵称',
    'birth_date': '出生日期',
    'next': '下一步',
    'back': '返回',
    'complete': '完成',
    'your_occupation': '您的职业',
    'select_your_role': '选择您在电影行业中的主要角色',
    'screenwriter': '编剧',
    'director': '导演',
    'producer': '制片人',
    'assistant_director': '副导演',
    'cinematographer': '摄影师',
    'crew': '剧组成员',
    
    // Dashboard
    'dashboard': '仪表板',
    'projects': '项目',
    'my_company': '我的公司',
    'company_console': '公司控制台',
    'team': '团队',
    'profile': '个人资料',
    'premium_plan': '高级计划',
    'search_all': '搜索项目...',
    'quick_actions': '快速操作',
    'new_project': '新项目',
    'invite_team': '邀请团队',
    'manage_company': '管理公司',
    'recent_projects': '最近的项目',
    'view_all': '查看全部',
    'updated': '更新于',
    'scenes': '场景',
    'recent_activity': '最近活动',
    'edited': '编辑了',
    'joined': '加入了',
    'commented': '评论了',
    'in': '在',
    
    // Profile
    'edit_profile': '编辑资料',
    'account_details': '账户详情',
    'company_affiliations': '公司关联',
    'member_since': '成为会员自',
    'location': '位置',
    'phone': '电话',
    'active_projects': '活跃项目',
    'scripts': '剧本',
    'collaborators': '合作者',
    'primary': '主要',
    'active': '活跃',
    'leave_company': '离开公司',
    'create_company': '创建公司',
    'company_name': '公司名称',
    'company_logo': '公司标志',
    'company_description': '公司描述',
    'address': '地址',
    'your_role': '您的角色',
    'cancel': '取消',
    'save_changes': '保存更改',
    
    // Admin Console
    'admin_console': '管理控制台',
    'manage_settings': '管理您的公司设置、团队成员和项目',
    'overview': '概览',
    'members': '成员',
    'roles': '角色',
    'company_profile': '公司资料',
    'financial_info': '财务信息',
    'current_plan': '当前计划',
    'payment_method': '支付方式',
    'billing_history': '账单历史',
    'pending_invites': '待处理邀请',
    'invite_members': '邀请成员',
    
    // Member Management
    'member_management': '成员管理',
    'manage_team_members': '管理您的团队成员及其访问级别',
    'add_member': '添加成员',
    'search_members': '按姓名或电子邮件搜索成员',
    'role': '角色',
    'status': '状态',
    'last_active': '最后活跃',
    'actions': '操作',
    'remove_member': '移除成员',
    'remove_confirm': '此操作无法撤消。该成员将失去对所有项目和公司资源的访问权限。',
    'change_role': '更改角色',
    'deactivate': '停用',
    'remove': '移除',
    'export_member_list': '导出成员列表',
    
    // Member Invite
    'invite_team_members': '邀请团队成员',
    'send_invitations': '发送邀请以在您的项目上进行协作',
    'email_invitations': '电子邮件邀请',
    'email_address': '电子邮件地址',
    'add_another_invitation': '添加另一个邀请',
    'personalized_message': '个性化消息（可选）',
    'personalized_message_placeholder': '在您的邀请中添加个人备注...',
    'invite_info': '被邀请者将收到一封带有链接的电子邮件，以加入您的公司。',
    'bulk_invite': '通过CSV批量邀请',
    'upload_csv': '上传CSV文件',
    'download_template': '下载模板',
    'preview_csv': '预览CSV导入',
    'send_invites': '发送邀请',
    'invitations_sent': '邀请发送成功',
    'invitations_sent_desc': '您的团队成员将收到一封带有加入说明的电子邮件。',
    
    // Role Management
    'role_management': '角色管理',
    'define_roles': '为您的团队成员定义角色和权限',
    'create_role': '创建角色',
    'role_info': '角色定义了团队成员在您的公司内可以做什么。',
    'system_roles_info': '系统角色无法删除，但您可以自定义其权限。',
    'role_name': '角色名称',
    'description': '描述',
    'default': '默认',
    'set_as_default': '设为默认',
    'system_role': '系统角色',
    'edit_role': '编辑角色',
    'delete_role': '删除角色',
    'delete_role_confirm': '此操作无法撤消。拥有此角色的成员需要重新分配。',
    'all_permissions': '所有权限',
    'permissions': '权限',
    'make_default_role': '将此设为新成员的默认角色',
    
    // Project Management
    'project_management': '项目管理',
    'manage_projects': '管理所有公司项目及其团队成员',
    'create_project': '创建项目',
    'search_projects': '按标题搜索项目',
    'type': '类型',
    'project': '项目',
    'last_updated': '最后更新',
    'created': '创建于',
    'delete_project': '删除项目',
    'delete_project_confirm': '此操作无法撤消。所有项目数据，包括剧本和资产，将被永久删除。',
    'archive': '归档',
    'export': '导出',
    'duplicate': '复制',
    'export_project_list': '导出项目列表',
    
    // Editor
    'scene-heading': '场景标题',
    'action': '动作',
    'character': '角色',
    'parenthetical': '括号注释',
    'dialogue': '对白',
    'transition': '转场',
    'text': '文本',
    'shot': '镜头',
    'editor_instruction': '按Tab键循环格式，按Enter键按照剧本规则创建新块',
    'click_to_edit_header': '点击编辑页眉',
    'click_to_edit_footer': '点击编辑页脚',
    
    // Scene Types
    'interior_scene': '室内场景',
    'exterior_scene': '室外场景',
    'interior_exterior_scene': '从室内到室外的场景',
    'exterior_interior_scene': '从室外到室内的场景',
    
    // Transitions
    'cut_to_desc': '标准切到下一个场景',
    'fade_out_desc': '淡出至黑',
    'fade_in_desc': '从黑色淡入',
    'dissolve_to_desc': '溶解到下一个场景',
    'smash_cut_desc': '突然转场',
    'match_cut_desc': '场景之间的视觉元素匹配',
    
    // Shot Types
    'wide_shot_desc': '从远处显示整个场景',
    'close_up_desc': '显示细节，通常是脸部',
    'medium_shot_desc': '显示角色从腰部以上',
    'tracking_shot_desc': '摄像机跟随主体',
    'pov_shot_desc': '从角色的视角',
    'aerial_shot_desc': '从上方拍摄',
    'dolly_shot_desc': '摄像机在轨道上移动',
    'establishing_shot_desc': '显示位置背景',
    'extreme_close_up_desc': '非常紧密地聚焦于细节',
    'crane_shot_desc': '摄像机垂直移动',
    
    // Enter Rules
    'enter_rules_title': 'Enter键行为',
    'enter_rule_scene': '创建一个新的动作块',
    'enter_rule_action': '创建一个新的角色块',
    'enter_rule_character': '创建一个新的对白块',
    'enter_rule_parenthetical': '创建一个新的对白块',
    'enter_rule_dialogue': '创建一个新的角色块',
    'enter_rule_dialogue_double': '双击Enter创建一个动作块',
    'enter_rule_transition': '创建一个新的场景标题块',
    'enter_rule_text': '创建一个新的动作块',
    'enter_rule_shot': '创建一个新的动作块',
    
    // Tips
    'tip_tab_format': '按Tab键循环切换块格式',
    'tip_enter_newline': '按Enter键按照剧本格式创建新行',
    'tip_scene_heading': '输入INT.或EXT.自动格式化为场景标题',
    'tip_shortcuts': '使用Alt+1-8快速更改块格式',
    
    // Footer
    'developed_by': '由 Studio Commuan 开发，电影技术专家',
    'all_rights_reserved': '版权所有'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}