import React from 'react';
import { Card } from "@blueprintjs/core";

const CategoryCard = ({ 
  title, 
  imageUrl, 
  onClick, 
  style = {},
  className = "",
  imageStyle = {},
  titleStyle = {}
}) => {
  return (
    <Card
      className={`category-card ${className}`}
      interactive={true}
      onClick={onClick}
      style={{ padding: 0, ...style }}
    >
      <img 
        src={imageUrl} 
        alt={title} 
        className="category-card-image"
        style={imageStyle}
      />
      <div 
        className="category-card-title"
        style={titleStyle}
      >
        {title}
      </div>
    </Card>
  );
};

export default CategoryCard;