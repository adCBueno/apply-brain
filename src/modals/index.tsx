import type { ModalSpec } from '../ui'
import { AppModal } from './AppModal'
import { DataModal } from './Data'
import { ContactModal, ImportModal, SnippetModal } from './Other'

export function ModalHost({ spec }: { spec: ModalSpec }) {
  switch (spec.kind) {
    case 'app':
      return <AppModal id={spec.id} stage={spec.stage} tab={spec.tab} />
    case 'contact':
      return <ContactModal id={spec.id} />
    case 'snippet':
      return <SnippetModal id={spec.id} />
    case 'import':
      return <ImportModal />
    case 'data':
      return <DataModal />
  }
}
