/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProfileConfig } from '../types/brainConfig';

export const DEFAULT_PHOTO_HEAD = '/src/assets/images/grace_photo_head_1791402567931.jpg';

export const DEFAULT_BRAIN_CONFIG: ProfileConfig = {
  photoUrl: DEFAULT_PHOTO_HEAD,
  profileTitle: 'Kahewa Grace Productivity Profile',
  icons: {
    camera: {
      id: 'camera',
      name: 'Social Media',
      tag: 'Socials',
      badge: 'Visuals & Lifestyle',
      title: "Grace's Social Media",
      subtitle: 'Curated aesthetics, daily routines & content creation',
      colorTheme: 'pink',
      quote: {
        text: 'Visual storyteller sharing intentional living, aesthetic moments, creative routines, and productivity journeys through my lens.',
      },
      containers: [
        {
          id: 'camera-links',
          title: 'My Social Channels',
          type: 'links',
          items: [
            {
              id: 'c-1',
              title: 'Instagram',
              subtitle: '@bygreys',
              url: 'https://instagram.com',
              iconType: 'instagram',
              tag: 'Daily Posts'
            },
            {
              id: 'c-2',
              title: 'TikTok',
              subtitle: '@kahewa.grace',
              url: 'https://tiktok.com',
              iconType: 'globe',
              tag: 'Vlogs & Habits'
            },
            {
              id: 'c-3',
              title: 'YouTube',
              subtitle: '@KahewaGrace',
              url: 'https://youtube.com',
              iconType: 'youtube',
              tag: 'Planning Vlogs'
            },
            {
              id: 'c-4',
              title: 'Pinterest',
              subtitle: '@bygreys',
              url: 'https://pinterest.com',
              iconType: 'heart',
              tag: 'Aesthetic Boards'
            }
          ]
        }
      ]
    },
    cross: {
      id: 'cross',
      name: 'Faith & Kingdom',
      tag: 'Faith',
      badge: 'Spiritual Foundation',
      title: 'Faith & Serving the Kingdom',
      subtitle: 'Rooted in Christ • Walking by faith, not by sight',
      colorTheme: 'amber',
      quote: {
        text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters, since you know that you will receive an inheritance from the Lord as a reward. It is the Lord Christ you are serving.',
        author: '— Colossians 3:23-24'
      },
      containers: [
        {
          id: 'cross-service',
          title: 'Ways I Serve the Kingdom',
          type: 'info_list',
          items: [
            {
              id: 'cr-1',
              title: 'Worship & Media Team',
              description: 'Serving at local church with tech, sound, visual storytelling, and worship service preparations.',
              emoji: '✝️'
            },
            {
              id: 'cr-2',
              title: 'Youth & Young Adult Fellowship',
              description: 'Mentoring younger girls, co-leading small group scripture study, and building uplifting community.',
              emoji: '✝️'
            },
            {
              id: 'cr-3',
              title: 'Community Outreach & Giving',
              description: 'Participating in food bank drives, charity drives, and hospitality ministry for families in need.',
              emoji: '✝️'
            },
            {
              id: 'cr-4',
              title: 'Daily Prayer & Intercession',
              description: 'Maintaining a daily devotional life, praying for friends, church, and sharing God’s love through encouragement.',
              emoji: '✝️'
            }
          ]
        },
        {
          id: 'cross-verse',
          type: 'text_card',
          title: 'Core Scripture',
          text: '“For by grace you have been saved through faith.” — Ephesians 2:8',
          items: []
        }
      ]
    },
    briefcase: {
      id: 'briefcase',
      name: 'Career & Work',
      tag: 'Work',
      badge: 'Professional & Work',
      title: 'Career & Professional Work',
      subtitle: 'Creative Direction • Brand Consulting • Digital Strategy',
      colorTheme: 'blue',
      containers: [
        {
          id: 'briefcase-about',
          title: 'What I Do',
          type: 'text_card',
          text: 'Creative Strategist & Digital Designer specializing in crafting meaningful brand identities, structured productivity workflows, and high-impact digital experiences. Experienced in orchestrating multi-channel creative direction and agile execution.',
          items: []
        },
        {
          id: 'briefcase-cards',
          title: 'Core Expertise',
          type: 'cards',
          items: [
            { id: 'b-card-1', title: 'Creative Brand Direction', emoji: '✨' },
            { id: 'b-card-2', title: 'UI/UX Systems & Kits', emoji: '📐' },
            { id: 'b-card-3', title: 'Digital Workflow Consulting', emoji: '📊' },
            { id: 'b-card-4', title: 'Content Architecture', emoji: '🚀' }
          ]
        },
        {
          id: 'briefcase-links',
          title: 'Professional Links & Inquiries',
          type: 'links',
          items: [
            {
              id: 'b-link-1',
              title: 'LinkedIn',
              subtitle: 'Kahewa Grace',
              url: 'https://linkedin.com',
              iconType: 'linkedin',
              tag: 'Connect'
            },
            {
              id: 'b-link-2',
              title: 'Email Inquiries',
              subtitle: 'bygreys.na@gmail.com',
              url: 'mailto:bygreys.na@gmail.com',
              iconType: 'mail',
              tag: 'Get in touch'
            }
          ]
        }
      ]
    },
    book: {
      id: 'book',
      name: 'Education',
      tag: 'Education',
      badge: 'Academics & Growth',
      title: 'Education & Studies',
      subtitle: 'Continuous learning, research & intellectual craft',
      colorTheme: 'emerald',
      containers: [
        {
          id: 'book-degree',
          title: 'Academic Degree',
          type: 'text_card',
          badge: 'Honors',
          text: 'Bachelor of Science / Arts • Interactive Media & Computing. Focused on Human-Computer Interaction, systems analysis, and modern digital communication architectures.',
          items: []
        },
        {
          id: 'book-certifications',
          title: 'Certifications & Focus Areas',
          type: 'info_list',
          items: [
            {
              id: 'bk-1',
              title: 'Product Strategy & UX Architecture',
              description: 'Human-centered system design and accessible interaction frameworks.',
              emoji: '🌱'
            },
            {
              id: 'bk-2',
              title: 'Agile Project Management & Workflow Optimization',
              description: 'Productivity workflows, sprint planning, and asynchronous team execution.',
              emoji: '🌱'
            },
            {
              id: 'bk-3',
              title: 'Theological Studies & Christian Apologetics',
              description: 'Scripture hermeneutics, personal discipleship, and biblical worldview.',
              emoji: '🌱'
            }
          ]
        }
      ]
    },
    controller: {
      id: 'controller',
      name: 'Hobbies',
      tag: 'Hobbies',
      badge: 'Passions & Play',
      title: "Grace's Hobbies",
      subtitle: 'Favorite pastimes and how I recharge',
      colorTheme: 'purple',
      containers: [
        {
          id: 'controller-hobbies',
          title: 'Favorite Pastimes',
          type: 'info_list',
          items: [
            {
              id: 'h-1',
              title: 'Cozy & Adventure Gaming',
              description: 'Animal Crossing: New Horizons, The Legend of Zelda: Tears of the Kingdom, Stardew Valley, and cozy indie games.',
              emoji: '🎮'
            },
            {
              id: 'h-2',
              title: 'Photography & Film Archives',
              description: 'Golden hour portraits, street textures, film simulations, and capturing spontaneous everyday joys.',
              emoji: '📸'
            },
            {
              id: 'h-3',
              title: 'Matcha Hunting & Aesthetic Cafes',
              description: 'Exploring quiet neighborhood cafes, reviewing ceremonial-grade iced matcha lattes, and reading in sunny corners.',
              emoji: '🍵'
            },
            {
              id: 'h-4',
              title: 'Stationery, Paper Craft & Journaling',
              description: 'Bullet journaling, fountain pens, sticker collections, and intentional weekly reflection layouts.',
              emoji: '📔'
            },
            {
              id: 'h-5',
              title: 'Mindful Movement & Morning Walks',
              description: 'Pilates reformer sessions, outdoor morning walks with worship playlists, and mindful breathwork.',
              emoji: '🧘‍♀️'
            }
          ]
        }
      ]
    }
  }
};
