import { 
  collection, query, where, onSnapshot,
  doc, setDoc, deleteDoc, serverTimestamp,
  Timestamp, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import type { 
  CollaboratorCursor, SceneLock,
  Screenplay, Scene 
} from '../../types';

export class CollaborationManager {
  private screenplay: Screenplay;
  private userId: string;
  private cursorListeners: Map<string, () => void>;
  private lockListeners: Map<string, () => void>;
  private onCursorUpdate: (cursors: CollaboratorCursor[]) => void;
  private onSceneLock: (locks: SceneLock[]) => void;

  constructor(
    screenplay: Screenplay, 
    userId: string,
    onCursorUpdate: (cursors: CollaboratorCursor[]) => void,
    onSceneLock: (locks: SceneLock[]) => void
  ) {
    this.screenplay = screenplay;
    this.userId = userId;
    this.cursorListeners = new Map();
    this.lockListeners = new Map();
    this.onCursorUpdate = onCursorUpdate;
    this.onSceneLock = onSceneLock;
  }

  public async startCollaboration(): Promise<void> {
    // Listen for cursor updates
    const cursorQuery = query(
      collection(db, 'cursor_positions'),
      where('screenplayId', '==', this.screenplay.id)
    );

    const unsubscribeCursor = onSnapshot(cursorQuery, (snapshot) => {
      const cursors = snapshot.docs
        .map(doc => doc.data() as CollaboratorCursor)
        .filter(cursor => cursor.userId !== this.userId);
      this.onCursorUpdate(cursors);
    });

    this.cursorListeners.set('main', unsubscribeCursor);

    // Listen for scene locks
    const lockQuery = query(
      collection(db, 'scene_locks'),
      where('screenplayId', '==', this.screenplay.id)
    );

    const unsubscribeLock = onSnapshot(lockQuery, (snapshot) => {
      const locks = snapshot.docs
        .map(doc => doc.data() as SceneLock)
        .filter(lock => 
          lock.userId !== this.userId && 
          lock.expires.toMillis() > Date.now()
        );
      this.onSceneLock(locks);
    });

    this.lockListeners.set('main', unsubscribeLock);
  }

  public async updateCursorPosition(
    sceneId: string, 
    blockId: string, 
    offset: number
  ): Promise<void> {
    try {
      const cursorRef = doc(db, 'cursor_positions', this.userId);
      await setDoc(cursorRef, {
        userId: this.userId,
        screenplayId: this.screenplay.id,
        sceneId,
        position: {
          blockId,
          offset
        },
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to update cursor position:', err);
    }
  }

  public async clearCursorPosition(): Promise<void> {
    try {
      const cursorRef = doc(db, 'cursor_positions', this.userId);
      await deleteDoc(cursorRef);
    } catch (err) {
      console.error('Failed to clear cursor position:', err);
    }
  }

  public cleanup(): void {
    // Remove all listeners
    for (const unsubscribe of this.cursorListeners.values()) {
      unsubscribe();
    }
    this.cursorListeners.clear();

    for (const unsubscribe of this.lockListeners.values()) {
      unsubscribe();
    }
    this.lockListeners.clear();

    // Clear cursor position
    this.clearCursorPosition().catch(console.error);
  }
}