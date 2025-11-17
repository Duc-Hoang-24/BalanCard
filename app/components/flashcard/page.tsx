'use client'
import React, { Suspense } from 'react'
import CoreLearning from './core_learning'

const Flashcard = () => {
  return (
    <div>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <span className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400 inline-block"></span>
            <p className="text-white mt-4">Loading...</p>
          </div>
        </div>
      }>
        <CoreLearning/>
      </Suspense>
    </div>
  )
}

export default Flashcard