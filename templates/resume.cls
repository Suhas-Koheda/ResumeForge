% RESUME DOCUMENT STYLE -- Released 23 Nov 1989
%    for LaTeX version 2.09
% Copyright (C) 1988,1989 by Michael DeCorte

\typeout{Document Style `resume' <26 Sep 89, Dec 07>.}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% resume.sty
%
% \documentstyle{resume}
%
% Copyright (c) 1988 by Michael DeCorte
% Permission to copy all or part of this work is granted, provided
% that the copies are not made or distributed for resale, and that
% the copyright notice and this notice are retained.
%
% THIS WORK IS PROVIDED ON AN "AS IS" BASIS.  THE AUTHOR PROVIDES NO
% WARRANTY WHATSOEVER, EITHER EXPRESS OR IMPLIED, REGARDING THE WORK,
% INCLUDING WARRANTIES WITH RESPECT TO ITS MERCHANTABILITY OR FITNESS
% FOR ANY PARTICULAR PURPOSE.
%
% If you make any improvements, I'd like to hear about them.
%
% Michael DeCorte
% P.O. Box 652
% Potsdam NY 13676
% mrd@sun.soe.clarkson.edu
% mrd@clutx.bitnet
%
% Changes for LaTeX2e -- Venkat Krishnamurthy (Aug 7, 2001)
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\NeedsTeXFormat{LaTeX2e}[1995/12/01]
\ProvidesClass{resume}[2000/05/19 v1.4b Resume class]

\PassOptionsToClass{11pt,12pt}{article}
\LoadClassWithOptions{article}

\newif\if@line
\newif\if@margin

\DeclareOption{line}{\@linetrue}
\DeclareOption{centered}{\@linefalse}

\DeclareOption{margin}{\@margintrue}
\DeclareOption{overlapped}{\@marginfalse}

\ExecuteOptions{overlapped,centered}
\ProcessOptions\relax

\nofiles	     % resume's don't need .aux files


\newtoks\tabular@text		    % holds the current list being processed
\newtoks\tabular@head		    % holds the head tabular list
\newtoks\tabular@tail		    % holds the tail tabular list
\newtoks\@ta			    % used by \@append
\newtoks\undefined@token\undefined@token={}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% prints a centered name with the address centered
% or the two address on opposite sides of the page
%
\def\@printcentername{\begingroup
  % print the name centered
  \leavevmode\hbox to \textwidth{\hfil\@tablebox{\namefont\@name}\hfil}\par
  \@ifundefined{@addressone}{%
    % do nothing
  }{%
    \@ifundefined{@addresstwo}{
      % only one address
      \leavevmode\hbox to \textwidth{\hfil\@tablebox{\@addressone}\hfil}\par
    }{
      % two addresses
      \leavevmode\hbox to \textwidth{\@tablebox{\@addressone}\hfil
				     \@tablebox{\@addresstwo}}\par
    }%
  }%
\endgroup}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% this is used to print the name and address at the top of
% the page with a hline in between
%
\def\namefont{\large\bf}
\def\@linename{\begingroup
  \def\\{, }
  {\namefont\@name}
  \vskip 2pt
  \fullline
  \vskip 2pt
  % where do you live?
  \@ifundefined{@addressone}{%
    % do nothing
  }{%
    \leavevmode\hbox to \textwidth
      {\hfill\vbox{\hbox{\@addressone}
		   \hbox{\@addresstwo}
		  }%
      }\par
  }
\endgroup}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% HEADINGS:
%
\let\print@name\relax
\def\ds@centered{\ifx\print@name\relax\let\print@name\@printcentername\fi}
\def\ds@line{\ifx\print@name\relax\let\print@name\@linename\fi}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Use this to set the sectionwidth.
%
\def\sectionfont{\bf}
\newdimen\sectionwidth
\newskip\sectionskip
\newdimen\resumewidth

\resumewidth=6.5in
\sectionskip=3.5ex plus 1ex minus -.2ex % values stolen from LaTeX

\def\newsectionwidth#1{%
		     \sectionwidth=#1
		     \textwidth=\resumewidth
		     \advance\textwidth-\sectionwidth
		     \hsize=\textwidth
		     \hoffset=\sectionwidth
}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% This is for sectiontitles that are entirely in the left margin.
%
\def\boxed@sectiontitle#1{%
  \ifx\\\@tabcr    % is this in a tabular?
    \@stopfield    % the is the first part of a \kill
   \else
     \@@par	     % This will end the previous paragraph if needed
  \fi
  \begingroup
  \everypar={}%
  \def\par{\@@par}%
  \let\\=\@normalcr
  \addpenalty{\@secpenalty}
  \addvspace{\sectionskip}
  \hbox to 0pt{%
    \hss
    \vtop to 0pt{%
      \leftskip=0pt
      \hsize=\sectionwidth
      \textwidth=\sectionwidth
      \raggedright
      \sectionfont
      #1\vss
    }%
  }%
  \addpenalty{-\@secpenalty}
  \vskip-\baselineskip
  \endgroup
  \ifx\\\@tabcr   % is this in a tabular?
    \@startline
   \ignorespaces
  \else
    \vskip-\parskip
  \fi
}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% This is for sectiontitles that are entirely above the section text
%
\def\unboxed@sectiontitle#1{%
  \ifx\\\@tabcr % see boxed@sectiontitle for explation
    \@stopfield
   \else
     \@@par
  \fi
  \begingroup
  \everypar={}%
  \def\par{\@@par}%
  \def\\{ }
  \addpenalty{\@secpenalty}
  \addvspace{\sectionskip}
  \hbox to 0pt{\hss\hbox to \sectionwidth{\sectionfont#1\hss}}
  \addpenalty{-\@secpenalty} % this would be a bad place for a page break
  \endgroup
  \ifx\\\@tabcr   % see boxed@sectiontitle for explation
    \@startline
  \else
    \vskip-\parskip
  \fi
  \ignorespaces
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%
\let\@@section\relax
\def\ds@overlapped{\ifx\@@section\relax\newsectionwidth{0.5in}\let
  \@@section\unboxed@sectiontitle\fi}
\def\ds@margin{\ifx\@@section\relax\newsectionwidth{1.3in}\let
  \@@section\boxed@sectiontitle\fi}

% Defaults
\if@line\ds@line\else\ds@centered\fi
\if@margin\ds@margin\else\ds@overlapped\fi


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% typeset resume all nice and pretty
%
\def\Resume{{R\'{e}sum\'{e}}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% makes a line of width \textwidth starting at -\hoffset
%
\def\fullline{		% hrules only listen to \hoffset
  \nointerlineskip	% so I have this code	  
  \moveleft\hoffset\vbox{\hrule width\textwidth} 
  \nointerlineskip
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% create a multiline box.
%
\def\@tablebox#1{\begin{tabular}[t]{@{}l@{\extracolsep{\fill}}}#1\end{tabular}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% use this to define your name
%
\def\name#1{\def\@name{#1}}

\def\@name{}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% use this to define your address
%
\let\@addressone\relax
\let\@addresstwo\relax

\def\address#1{
  \@ifundefined{@addressone}{\def\@addressone{#1}}{\def\@addresstwo{#1}}}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% opening
%
\def\opening{\def\@opening{}
  \begingroup
  \leftskip=-\hoffset
  \advance\textwidth\hoffset
  \hsize=\textwidth
  \let\par=\@@par
  \parindent=0pt
  \parskip=0pt
  \print@name
  \endgroup
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% all of the resume goes in the resume environment
%
\newenvironment{resume}{\begingroup
		       \@ifundefined{@opening}{\opening}{}
}{\endgroup}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% ncolumn
%
\def\@endpbox{\par\egroup\hfil}
\let\@@endpbox=\@endpbox

\newdimen\@columnwidth
\def\ncolumn#1{%
  \@columnwidth=\textwidth \divide\@columnwidth by #1
  \begin{tabular*}{\textwidth}[t]%
	{*{#1}{@{}p{\@columnwidth}@{\extracolsep{\fill}}}}
}

\def\endncolumn{\end{tabular*}}


%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\def\employer#1{\def\@employer{\print@employer{#1}}}
\def\location#1{\def\@location{\print@location{#1}}}
\def\dates#1{\def\@dates{\print@dates{#1}}}
\def\title#1{\def\@title{\print@title{#1}}}

\let\l@justify\raggedright
\let\r@justify\raggedleft
\let\c@justify\centering

\def\@format#1#2{%
  \expandafter\gdef\csname print@#1\endcsname##1{%
    {\csname#2@justify\endcsname##1\par}}
}

\newcounter{numberofcolumns}
\newenvironment{format}{%
  \def\end@line@head{\append@tabular@head{tabular@text}\tabular@text={}%
    \c@numberofcolumns 0}
  \def\end@line@tail{\append@tabular@tail{tabular@text}\tabular@text={}%
    \c@numberofcolumns 0}
  \tabular@text={}
  \tabular@head={}
  \tabular@tail={}
  \c@numberofcolumns 0
  \let\\=\end@line@head
  \def\employer##1{\advance\c@numberofcolumns 1
		   \@format{employer}{##1}
		   \append@tabular@text{employer}}
  \def\location##1{\advance\c@numberofcolumns 1
		   \@format{location}{##1}
		   \append@tabular@text{location}}
  \def\dates##1{\advance\c@numberofcolumns 1
		\@format{dates}{##1}
		\append@tabular@text{dates}}
  \def\title##1{\advance\c@numberofcolumns 1
		 \@format{title}{##1}
		\append@tabular@text{title}}
  \def\body{\iftoks\tabular@head\undefined@token\then
	    \else
	      \@append{\noexpand\\}\to\tabular@head
	    \skotfi
	    \let\\=\end@line@tail}}{}

\def\@append#1\to#2{%
  \@ta=\expandafter{#1}%
  \xdef\@append@temp{\the#2\the\@ta}
  \global#2=\expandafter{\@append@temp}%
}

\let \then = \empty
\def \iftoks #1#2\then #3\else #4\skotfi{
		\edef \1{\the #1}
		\edef \2{\the #2}
		\ifx \1\2\then #3\else #4\fi}

\def\append@tabular@text#1{%
\iftoks\tabular@text\undefined@token\then
  \global\tabular@text=\expandafter{\csname @#1\endcsname}
\else
  \@append{&}\to\tabular@text
  \@append{\csname @#1\endcsname}\to\tabular@text
\skotfi
}

\def\append@tabular@head#1{%
  \ifnum\the\c@numberofcolumns=0\relax
  \else
    \iftoks\tabular@head\undefined@token\then
      \relax
    \else
      \@append{\noexpand\\}\to\tabular@head
      \@append{\noexpand\penalty-\@secpenalty}\to\tabular@head
    \skotfi
    \@append{\noexpand\begin{ncolumn}}\to\tabular@head
    \@append{\expandafter{\the\c@numberofcolumns}}\to\tabular@head
    \@append{\the\csname#1\endcsname}\to\tabular@head
    \@append{\noexpand\end{ncolumn}}\to\tabular@head
  \fi
}

\def\append@tabular@tail#1{%
  \ifnum\the\c@numberofcolumns=0\relax
  \else
    \iftoks\tabular@tail\undefined@token\then
    \else
      \@append{\noexpand\\}\to\tabular@tail
      \@append{\noexpand\penalty-\@secpenalty}\to\tabular@tail
    \skotfi
    \@append{\noexpand\begin{ncolumn}}\to\tabular@tail
    \@append{\expandafter{\the\c@numberofcolumns}}\to\tabular@tail
    \@append{\the\csname#1\endcsname}\to\tabular@tail
    \@append{\noexpand\end{ncolumn}}\to\tabular@tail
  \fi
}

\newenvironment{position}%
  {%
   \begingroup
     \par
       \the\tabular@head
     \penalty -\@secpenalty
     \penalty 10000
     \ignorespaces
  }{%
       \the\tabular@tail
     \penalty \@secpenalty
    \endgroup
}

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
\penalty -500
\topmargin 0pt
\headheight 0pt
\headsep 0pt
\textheight 9in
\parindent 0pt
\topmargin 0in
\oddsidemargin 0pt
\evensidemargin 0pt
\marginparwidth 0pt
\parindent 0pt
\parskip \baselineskip
\setcounter{secnumdepth}{0}
\def\@listI{\leftmargin\leftmargini
\topsep 0pt 
\parskip 0pt
\partopsep 10pt plus 2pt
\parsep 2pt plus 2pt
\itemsep \parsep}

\pagestyle{empty}

\begin{format}
\title{l}\employer{r}\\
\location{l}\dates{r}\\
\body\\
\end{format}

\let\section\@@section

%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\oddsidemargin -11mm
\evensidemargin -11mm
\textwidth=150mm
\itemsep=0cm
\parsep=0cm
\topmargin -5mm
\textheight 265mm

\newenvironment{list1}{
  \begin{list}{\ding{113}}{%
      \setlength{\itemsep}{0in}
      \setlength{\parsep}{0in} \setlength{\parskip}{0in}
      \setlength{\topsep}{0in} \setlength{\partopsep}{0in} 
      \setlength{\leftmargin}{0in}}}{\end{list}}

\newenvironment{list2}{
  \begin{list}{$\bullet$}{%
      \setlength{\itemsep}{0in}
      \setlength{\parsep}{0in} \setlength{\parskip}{0in}
      \setlength{\topsep}{0in} \setlength{\partopsep}{0in} 
      \setlength{\leftmargin}{0.25in}}}{\end{list}}

\newcommand{\mysidestyle}{\small\sc}
\newcommand{\myheadingstyle}{\sl}
\newcommand{\mysubheadingstyle}{\sl}
