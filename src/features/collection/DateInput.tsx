import { useState } from 'react';
import { isCompleteDate } from '../../lib/date';

interface Props {
  value: string;
  max?: string;
  /** 완전한 날짜가 됐을 때만 부른다 (연도를 한 자리씩 칠 때 "0201" 같은 중간값은 저장하지 않음) */
  onCommit: (iso: string) => void;
  required?: boolean;
}

/** 브라우저 날짜 입력. 입력 중에는 화면에만 두고, 날짜가 다 맞춰지면 저장한다 */
export function DateInput({ value, max, onCommit, required }: Props) {
  const [draft, setDraft] = useState(value);
  // 바깥에서 값이 바뀌면(저장됨, 사진 날짜로 바꾸기 등) 입력 중이던 값을 따라 맞춘다
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  return (
    <input
      type="date"
      value={draft}
      max={max}
      required={required}
      onChange={(e) => {
        setDraft(e.target.value);
        if (isCompleteDate(e.target.value, max) && e.target.value !== value) onCommit(e.target.value);
      }}
      // 덜 친 채로 나가면 원래 날짜로 되돌린다
      onBlur={() => !isCompleteDate(draft, max) && setDraft(value)}
    />
  );
}
