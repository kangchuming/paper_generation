
import MenuNavigation from './components/Menu/Menu';
import GenerationArticle from './pages/article';
import Tiptap from '@components/Tiptap';
import styles from './App.module.scss';

function App() {

  return (
    <div className={styles.app}>
      <MenuNavigation />
      <GenerationArticle />
      <Tiptap />
    </div>
  )
}

export default App;
