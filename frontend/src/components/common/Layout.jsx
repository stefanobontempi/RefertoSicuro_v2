import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 relative overflow-hidden">
      {/* Animated Background Spheres */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* First Sphere - #028172 at 50% opacity */}
        <div
          className="absolute w-96 h-96 rounded-full blur-3xl opacity-50 animate-float-slow"
          style={{
            backgroundColor: '#028172',
            top: '10%',
            left: '5%',
            animationDelay: '0s',
            willChange: 'transform'
          }}
        ></div>

        {/* Second Sphere - #028172 at 45% opacity */}
        <div
          className="absolute w-80 h-80 rounded-full blur-3xl opacity-45 animate-float-medium"
          style={{
            backgroundColor: '#028172',
            top: '60%',
            right: '10%',
            animationDelay: '-23s',
            willChange: 'transform'
          }}
        ></div>

        {/* Third Sphere - #50879D at 50% opacity */}
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-50 animate-float-fast"
          style={{
            backgroundColor: '#50879D',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            animationDelay: '-39s',
            willChange: 'transform'
          }}
        ></div>
      </div>
      
      {/* Header outside of content wrapper for Safari z-index fix */}
      <Header />

      {/* Content */}
      <div className="relative min-h-screen flex flex-col">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;