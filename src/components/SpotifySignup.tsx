"use client";

import AuthCard from './AuthCard';

// Replaced SpotifySignup multi-step wizard with the unified UniNest AuthCard pattern
export default function SpotifySignup() {
  return <AuthCard initialTab="signup" />;
}
