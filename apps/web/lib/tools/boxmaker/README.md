# BoxMaker Tool Integration

## Setup Instructions

### 1. Copy Source Files

Copy the following from the BoxMaker repository (https://github.com/mariusboiti/boxmaker):

```bash
# From BoxMaker repo root, copy:
src/** → apps/web/lib/tools/boxmaker/src/

# If there are assets in public/:
public/** → apps/web/public/tools/boxmaker/
```

### 2. Verify Structure

After copying, you should have:
```
apps/web/lib/tools/boxmaker/
├── src/              # All BoxMaker source code
│   ├── App.tsx       # Main component
│   ├── components/
│   ├── utils/
│   └── ...
├── ui/
│   └── BoxMakerTool.tsx  # Studio wrapper (already created)
├── tool.ts           # Tool metadata (already created)
├── index.ts          # Exports (already created)
└── README.md         # This file
```

### 3. Update Imports

After copying, check if `src/App.tsx` exists. If the main component has a different name or path, update the import in `ui/BoxMakerTool.tsx`.

### 4. Dependencies

BoxMaker may have dependencies not yet in the monorepo. Check `package.json` from BoxMaker repo and install any missing dependencies:

```bash
pnpm add <missing-dependencies>
```

### 5. Test

Navigate to: http://localhost:3000/studio/tools/boxmaker

Verify:
- [ ] Page loads without errors
- [ ] Inputs work
- [ ] Preview renders
- [ ] Export functions correctly
