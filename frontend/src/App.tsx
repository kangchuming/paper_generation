
import MenuNavigation from './components/Menu/Menu';
import GenerationArticle from './pages/article';
import styles from './App.module.scss';

function App() {

  return (
    <div className={styles.app}>
        <MenuNavigation />
        <GenerationArticle />
    </div>
  )
}

export default App
