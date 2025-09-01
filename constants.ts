

import React from 'react';
import { TicketType, AddOn, Customer } from './types';

// Simple SVG icon components for products
// FIX: Converted from JSX to React.createElement to be valid in a .ts file.
const GiftCardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" }, 
    React.createElement('path', { d: "M21.582,6.344l-5.926-5.926A.5.5,0,0,0,15.293,0H4.5A2.5,2.5,0,0,0,2,2.5v19A2.5,2.5,0,0,0,4.5,24h15A2.5,2.5,0,0,0,22,21.5V6.707A.5.5,0,0,0,21.582,6.344ZM16,2.414,19.586,6H16ZM21,21.5A1.5,1.5,0,0,1,19.5,23H4.5A1.5,1.5,0,0,1,3,21.5V2.5A1.5,1.5,0,0,1,4.5,1H15V6.5A.5.5,0,0,0,15.5,7H21Z" }),
    React.createElement('path', { d: "M12 11H7a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1zm-1 4H8v-2h3zM18 11h-3a1 1 0 0 0-1 1v1h2v-1h1a.999.999 0 0 0 .882-1.472A1 1 0 0 0 18 11z" })
  )
);
// FIX: Converted from JSX to React.createElement to be valid in a .ts file.
const JumpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm.5,4A1.5,1.5,0,1,1,11,7.5,1.5,1.5,0,0,1,12.5,6ZM16,17H13v-2a1,1,0,0,0-2,0v2H8V15a1,1,0,0,0-2,0v2a2,2,0,0,0,2,2h8a1,1,0,0,0,0-2Z" })
  )
);
// FIX: Converted from JSX to React.createElement to be valid in a .ts file.
const SocksIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M12.2,23.6,6.6,18a1,1,0,0,1,1.4-1.4L12,20.6l4-4a1,1,0,0,1,1.4,1.4l-4.6,4.6A1,1,0,0,1,12.2,23.6Z" }),
    React.createElement('path', { d: "M8.2,12.4,5.4,4.2A1,1,0,0,1,6.3,3h4.4a1,1,0,0,1,1,.8l1.3,4.6a1,1,0,0,1-1.9.6L10.2,6h-2L6.8,11.8A1,1,0,0,1,8.2,12.4Z" }),
    React.createElement('path', { d: "M18,11.8l-1.4-4.8a1,1,0,0,0-1-.8H12.3a1,1,0,1,1,0-2h3.3a3,3,0,0,1,2.9,2.2l2.8,8.2a1,1,0,0,1-.9,1.3,1,1,0,0,1-.4-.1,1,1,0,0,1-.6-1.3Z" })
  )
);
// FIX: Converted from JSX to React.createElement to be valid in a .ts file.
const DrinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M18,3H6A3,3,0,0,0,3,6V18a3,3,0,0,0,3,3H18a3,3,0,0,0,3-3V6A3,3,0,0,0,18,3Zm1,15a1,1,0,0,1-1,1H6a1,1,0,0,1-1-1V6A1,1,0,0,1,6,5H18a1,1,0,0,1,1,1Z" }),
    React.createElement('path', { d: "M8.5,11.5a3.5,3.5,0,1,0,3.5-3.5A3.5,3.5,0,0,0,8.5,11.5Zm5,0a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,13.5,11.5Z" })
  )
);
// FIX: Converted from JSX to React.createElement to be valid in a .ts file.
const FoodIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor" },
    React.createElement('path', { d: "M21.2,12.2a1,1,0,0,0-1,1.7,5,5,0,1,1-7.1-7.1,4.9,4.9,0,0,1,3,.8,1,1,0,1,0,1.2-1.6,7,7,0,1,0,8.1,8.1A1,1,0,0,0,21.2,12.2Z" }),
    React.createElement('path', { d: "M19.8,2.8a1,1,0,0,0-1.4,0l-3,3a1,1,0,0,0,1.4,1.4l3-3A1,1,0,0,0,19.8,2.8Z" })
  )
);


export const TICKET_TYPES: TicketType[] = [
  { id: 'tkt_gift', name: 'Gift Card', durationMinutes: 0, price: 0, color: 'blue-500', image: GiftCardIcon },
  { id: 'tkt_60', name: '1 hour jump', durationMinutes: 60, price: 500, color: 'yellow-400', image: JumpIcon },
  { id: 'tkt_90', name: '1.5 hour jump', durationMinutes: 90, price: 700, color: 'yellow-400', image: JumpIcon },
  { id: 'tkt_120', name: '2 hour jump', durationMinutes: 120, price: 850, color: 'orange-400', image: JumpIcon },
  { id: 'tkt_day', name: 'All Day Pass', durationMinutes: 480, price: 1200, color: 'orange-400', image: JumpIcon },
];

export const ADD_ONS: AddOn[] = [
  { id: 'addon_socks', name: 'Jump Socks', price: 100, color: 'red-500', image: SocksIcon },
  { id: 'addon_water', name: '600ml Drinks', price: 30, color: 'green-500', image: DrinkIcon },
  { id: 'addon_treats', name: 'Healthy Treats', price: 150, color: 'orange-500', image: FoodIcon },
  { id: 'addon_hotfood', name: 'Hot Food', price: 250, color: 'pink-500', image: FoodIcon },
];

// A simple placeholder for a signature image (1x1 transparent pixel)
const MOCK_SIGNATURE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    name: 'Aarav Sharma',
    dob: '1995-05-20', // Adult
    email: 'aarav.sharma@example.com',
    phone: '9876543210',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: null,
  },
  {
    id: 'cust_2',
    name: 'Priya Patel',
    dob: '2015-11-10', // Minor
    email: 'priya.patel@example.com',
    phone: '9876543211',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: 'Rajesh Patel',
  },
  {
    id: 'cust_3',
    name: 'Rohan Mehta',
    dob: '1988-02-15', // Adult
    email: 'rohan.mehta@example.com',
    phone: '9876543212',
    waiverSignedOn: null,
    waiverSignature: null,
    guardianName: null,
  },
  {
    id: 'cust_4',
    name: 'Saanvi Gupta',
    dob: '2003-09-01', // Adult
    email: 'saanvi.gupta@example.com',
    phone: '1234567890',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: null,
  },
  {
    id: 'cust_5',
    name: 'Aditya Singh',
    dob: '2018-01-30', // Minor
    email: 'aditya.singh@example.com',
    phone: '0987654321',
    waiverSignedOn: null,
    waiverSignature: null,
    guardianName: 'Vikram Singh',
  },
  // Group waiver test case (Verma Family)
  {
    id: 'cust_6',
    name: 'Anjali Verma',
    dob: '1985-08-15', // Adult Guardian
    email: 'anjali.verma@example.com',
    phone: '8888888888',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: null,
  },
  {
    id: 'cust_7',
    name: 'Ravi Verma',
    dob: '2014-03-25', // Minor
    email: 'anjali.verma@example.com',
    phone: '8888888888',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: 'Anjali Verma',
  },
  {
    id: 'cust_8',
    name: 'Sita Verma',
    dob: '2016-07-01', // Minor
    email: 'anjali.verma@example.com',
    phone: '8888888888',
    waiverSignedOn: new Date().toISOString(),
    waiverSignature: MOCK_SIGNATURE,
    guardianName: 'Anjali Verma',
  },
  // Expired waiver test case
  {
    id: 'cust_9',
    name: 'Karan Malhotra',
    dob: '1990-01-01', // Adult with expired waiver
    email: 'karan.m@example.com',
    phone: '7777777777',
    waiverSignedOn: new Date('2022-01-15T10:00:00Z').toISOString(), // Expired
    waiverSignature: MOCK_SIGNATURE,
    guardianName: null,
  },
];
