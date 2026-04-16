import '../Landing1.css'
import '../Landing2.css'
import Hero from '../landing/Hero'
import Features from '../landing/Features'
import DataSources from '../landing/DataSources'
import Architecture from '../landing/Architecture'

export default function Landing() {
  return (
    <div>
      <Hero />
      <Features />
      <DataSources />
      <Architecture />
    </div>
  )
}