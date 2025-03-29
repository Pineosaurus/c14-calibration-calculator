import React from 'react';
import { Colors } from '@blueprintjs/colors';

const Footer = () => {
  return (
    <footer style={{ 
      textAlign: 'center', 
      marginTop: '40px',
      marginBottom: '20px',
      color: Colors.GRAY3,
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      Made with 🖤 by Pine Dysart-Bricken
    </footer>
  );
};

export default Footer;